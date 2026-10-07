// GitHub Pages projects under one github.io account share one browser origin.
// Include the site's base path so every copy of this tool keeps its own cache, session and connection key.
const namespace = `shift-tool:v1:${import.meta.env?.BASE_URL ?? "/"}:`;

export const templateStorage = {
  getItem(key: string): string | null {
    return localStorage.getItem(namespace + key);
  },
  setItem(key: string, value: string): void {
    localStorage.setItem(namespace + key, value);
  },
  removeItem(key: string): void {
    localStorage.removeItem(namespace + key);
  },
  clearBusinessData(): void {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(namespace) && key !== namespace + "shift_api_key") localStorage.removeItem(key);
    }
  }
};
