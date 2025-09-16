let appDataPath: string | undefined;

export function setAppDataPath(path: string): void {
  appDataPath = path;
}

export function getAppDataPath(): string | undefined {
  return appDataPath;
}
