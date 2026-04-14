export const reloadMusicWebWithAlert = (
  message: string,
  error?: unknown,
): Promise<never> => {
  if (error) {
    console.error(error);
  }

  window.alert(message);
  window.location.reload();

  return new Promise<never>(() => {});
};
