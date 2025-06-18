// Define the structure for a Song based on your JSON
export interface Song {
  file: string;    // Filename like "01 黑色信封.m4a"
  title: string;
  track: number;
  src: string;     // Full path provided in JSON
}

// Define the structure for an Album based on your JSON
export interface Album {
  id: string;
  folder: string;  // Folder name like "2004 - 被禁忌的游戏"
  artist: string;
  title: string;
  year: string;
  coverImage: string; // Filename like "被禁忌的游戏.jpg"
  coverSrc: string;   // Full path provided in JSON
  tracks: number;     // Total track count
  songs: Song[];
}

// Define the structure of the entire library JSON
interface MusicLibraryData {
  albums: Album[];
}

// Function to fetch and process the music library data
export const loadMusicLibrary = async (): Promise<Album[]> => {
  try {
    // Use dynamic import to fetch the JSON file relative to the public directory
    // Vite automatically handles files in the public directory or root during deployment.
    const response = await fetch('/records/records-library.json');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: MusicLibraryData = await response.json();
    
    // We no longer need to process paths as they are provided in the JSON
    return data.albums;
    
  } catch (error) {
    console.error("Failed to load music library:", error);
    // Depending on requirements, you might want to return an empty array
    // or re-throw the error to be handled by the caller.
    return [];
  }
};
