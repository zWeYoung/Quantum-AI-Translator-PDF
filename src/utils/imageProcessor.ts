import { GPTConfig } from '../types';

const MAX_IMAGE_SIZE = 800;
const JPEG_QUALITY = 0.6;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function compressImage(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('图片大小不能超过 5MB');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(width, height));
      width *= scale;
      height *= scale;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建Canvas上下文'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const base64 = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      
      const compressedSize = Math.ceil((base64.length - 'data:image/jpeg;base64,'.length) * 0.75);
      if (compressedSize > MAX_FILE_SIZE) {
        reject(new Error('压缩后图片仍然过大，请使用更小的图片'));
        return;
      }

      resolve(base64);
    };

    img.onerror = () => reject(new Error('图片加载失败'));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

export async function processImage(
  file: File,
  gptConfig: GPTConfig
): Promise<string> {
  const base64Image = await compressImage(file);
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

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
          content: '你是一个图像识别器，使用markdown语法输出图片中的文字内容。'
        },
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: `请识别图片中的文字并使用markdown格式输出。要求：
1. 保持原文的格式和布局
2. 忽略水印和页码
3. 直接输出文字内容，不要添加任何解释或说明` 
            },
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
}