import * as pdfjsLib from 'pdfjs-dist';
import { saveAs } from 'file-saver';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export interface PDFPage {
  pageNumber: number;
  text: string;
}

const DEFAULT_PROMPT = `使用markdown语法，将图片中识别到的文字转换为markdown格式输出。你必须做到：
1. 输出和使用识别到的图片的相同的语言，例如，识别到英语的字段，输出的内容必须是英语。
2. 不要解释和输出无关的文字，直接输出图片中的内容。
3. 内容不要包含在\`\`\`markdown \`\`\`中、段落公式使用 $$ $$ 的形式、行内公式使用 $ $ 的形式、忽略掉长直线、忽略掉页码。
再次强调，不要解释和输出无关的文字，直接输出图片中的内容。`;

// Maximum dimensions for the rendered image
const MAX_DIMENSION = 2048;
const COMPRESSION_QUALITY = 0.8;

async function renderPageToImage(page: any): Promise<string> {
  // Calculate optimal scale to fit within MAX_DIMENSION while maintaining aspect ratio
  const viewport = page.getViewport({ scale: 1.0 });
  const scale = Math.min(
    MAX_DIMENSION / viewport.width,
    MAX_DIMENSION / viewport.height,
    2.0 // Maximum scale of 2.0 for quality
  );

  const scaledViewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { 
    willReadFrequently: true,
    alpha: false // Disable alpha channel for better performance
  });

  if (!context) {
    throw new Error('无法创建canvas上下文');
  }

  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  // Set white background
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvasContext: context,
    viewport: scaledViewport,
    background: 'white'
  };

  try {
    await page.render(renderContext).promise;
    
    // Convert to blob first to better handle memory
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('图片转换失败'));
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('图片读取失败'));
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        COMPRESSION_QUALITY
      );
    });
  } catch (error) {
    console.error('渲染PDF页面失败:', error);
    throw new Error('渲染PDF页面失败');
  }
}

async function processPageWithRetry(
  page: any,
  pageNum: number,
  gptConfig: { apiKey: string; baseUrl: string },
  retries = 2
): Promise<string> {
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const imageBase64 = await renderPageToImage(page);
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      
      const response = await fetch(`${gptConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${gptConfig.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: '你是一个PDF文档解析器，使用markdown和latex语法输出图片的内容。'
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: DEFAULT_PROMPT },
                { 
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Data}`
                  }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `API请求失败: ${response.statusText}${
            errorData.error?.message ? ` - ${errorData.error.message}` : ''
          }`
        );
      }

      const data = await response.json();
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('API返回的响应格式无效');
      }

      return data.choices[0].message.content.trim();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

export async function processPDF(
  file: File,
  gptConfig: { apiKey: string; baseUrl: string }
): Promise<PDFPage[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
      cMapPacked: true,
    });
    
    const pdf = await loadingTask.promise;
    const pages: PDFPage[] = [];
    const totalPages = Math.min(pdf.numPages, 50); // Limit to 50 pages for safety

    for (let i = 1; i <= totalPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const text = await processPageWithRetry(page, i, gptConfig);
        
        if (text.trim()) {
          pages.push({
            pageNumber: i,
            text: text.trim()
          });
        }
      } catch (error) {
        console.error(`处理第 ${i} 页时出错:`, error);
        throw new Error(`处理第 ${i} 页时出错: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    if (pages.length === 0) {
      throw new Error('未能从PDF中提取到任何有效内容');
    }

    return pages;
  } catch (error) {
    console.error('PDF处理错误:', error);
    if (error instanceof Error) {
      throw new Error(`PDF处理失败: ${error.message}`);
    }
    throw new Error('PDF处理失败，请确保文件格式正确并重试');
  }
}

export function exportToFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, filename);
}