import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 专辑信息，根据 records.md 文件整理
const albumInfo = [
  { id: "1", folder: "2004 - 被禁忌的游戏", title: "被禁忌的游戏", year: "2004", tracks: 9 },
  { id: "2", folder: "2006 - Has Man A Future_ (这个世界会好吗)", title: "Has Man A Future_ (这个世界会好吗)", year: "2006", tracks: 10 },
  { id: "3", folder: "2007 - 梵高先生 (B&BⅡ)", title: "梵高先生 (B&BⅡ)", year: "2007", tracks: 9 },
  { id: "4", folder: "2009 - 工体东路没有人", title: "工体东路没有人", year: "2009", tracks: 16 },
  { id: "5", folder: "2009 - 我爱南京", title: "我爱南京", year: "2009", tracks: 16 },
  { id: "6", folder: "2010 - 二零零九年十月十六日事件 (1016)", title: "二零零九年十月十六日事件 (1016)", year: "2010", tracks: 27 },
  { id: "7", folder: "2010 - 你好，郑州", title: "你好，郑州", year: "2010", tracks: 10 },
  { id: "8", folder: "2011 - F", title: "F", year: "2011", tracks: 9 },
  { id: "9", folder: "2011 - IMAGINE - 2011李志跨年音乐会", title: "IMAGINE - 2011李志跨年音乐会", year: "2011", tracks: 24 },
  { id: "10", folder: "2013 - 108个关键词", title: "108个关键词", year: "2013", tracks: 16 },
  { id: "11", folder: "2014 - 勾三搭四", title: "勾三搭四", year: "2014", tracks: 21 },
  { id: "12", folder: "2014 - 1701", title: "1701", year: "2014", tracks: 8 },
  { id: "13", folder: "2015 - i:O", title: "i/O", year: "2015", tracks: 11 },
  { id: "14", folder: "2015 - 看见", title: "看见", year: "2015", tracks: 10 },
  { id: "15", folder: "2016 - 動靜", title: "動靜", year: "2016", tracks: 11 },
  { id: "16", folder: "2016 - 8", title: "8", year: "2016", tracks: 9 },
  { id: "17", folder: "2016 - 李志北京不插电现场 2016.5.29", title: "李志北京不插电现场 2016.5.29", year: "2016", tracks: 12 },
  { id: "18", folder: "2016 - 在每一條傷心的應天大街上", title: "在每一條傷心的應天大街上", year: "2016", tracks: 8 },
  { id: "19", folder: "2017 - 李志、电声与管弦乐", title: "李志、电声与管弦乐", year: "2017", tracks: 12 },
  { id: "20", folder: "2018 - 爵士乐与不插电新编12首", title: "爵士乐与不插电新编12首", year: "2018", tracks: 12 },
  { id: "21", folder: "2018 - 李志、电声与管弦乐II", title: "李志、电声与管弦乐II", year: "2018", tracks: 9 }
];

// 基础路径
const basePath = '/Users/jason/Documents/Cerelib/Projects/Coding/Vinyl 系列/vinyl-vue/public/records';

// 创建专辑数据
const albums = [];

// 处理每个专辑
albumInfo.forEach(album => {
  const albumPath = path.join(basePath, album.folder);
  
  try {
    // 检查文件夹是否存在
    if (!fs.existsSync(albumPath)) {
      console.warn(`警告: 文件夹不存在: ${albumPath}`);
      return;
    }
    
    // 获取文件夹中的所有文件
    const files = fs.readdirSync(albumPath);
    
    // 查找封面图片
    const coverImage = files.find(file => 
      file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg')
    );
    
    if (!coverImage) {
      console.warn(`警告: 未找到封面图片: ${albumPath}`);
      return;
    }
    
    // 查找音频文件
    const audioFiles = files.filter(file => 
      file.endsWith('.m4a') || file.endsWith('.mp3')
    ).sort();
    
    if (audioFiles.length === 0) {
      console.warn(`警告: 未找到音频文件: ${albumPath}`);
      return;
    }
    
    // 创建歌曲列表
    const songs = audioFiles.map((file, index) => {
      // 从文件名中提取标题 (移除扩展名和前面的数字)
      const titleMatch = file.match(/^\d+\s+(.+)\.(m4a|mp3)$/);
      const title = titleMatch ? titleMatch[1] : file.replace(/\.(m4a|mp3)$/, '');
      
      return {
        file: file,
        title: title,
        track: index + 1,
        src: `./${album.folder}/${file}`
      };
    });
    
    // 创建专辑对象
    const albumObj = {
      id: album.id,
      folder: album.folder,
      artist: "李志",
      title: album.title,
      year: album.year,
      coverImage: coverImage,
      coverSrc: `./${album.folder}/${coverImage}`,
      tracks: songs.length,
      songs: songs
    };
    
    albums.push(albumObj);
    console.log(`成功处理专辑: ${album.title}`);
    
  } catch (error) {
    console.error(`处理专辑时出错 ${album.title}:`, error);
  }
});

// 创建最终的 JSON 对象
const libraryJson = {
  albums: albums
};

// 写入 JSON 文件
const outputPath = path.join(basePath, 'records-library-lizhi.json');
fs.writeFileSync(outputPath, JSON.stringify(libraryJson, null, 2), 'utf8');

console.log(`成功生成 JSON 文件: ${outputPath}`);
console.log(`总共处理了 ${albums.length} 张专辑`);
