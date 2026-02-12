export const formatTime = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    return `${hours}h ${totalMinutes % 60}m`;
  }

  return `${totalMinutes}m`;
};
