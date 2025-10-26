declare module 'spotify-url-info' {
  export default function spotifyUrlInfo(fetch: typeof globalThis.fetch): {
    getData: (url: string) => Promise<{
      name: string;
      artists?: Array<{ name: string }>;
      [key: string]: any;
    }>;
  };
}
