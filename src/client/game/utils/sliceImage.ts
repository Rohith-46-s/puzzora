export const DEFAULT_GRID_SIZE = 3;

export const getTileBackgroundPosition = (index: number, gridSize: number): string => {
  const size = gridSize > 0 ? gridSize : DEFAULT_GRID_SIZE;
  const row = Math.floor(index / size);
  const col = index % size;

  const x = col === 0 ? "0%" : col === size - 1 ? "100%" : `${(col / (size - 1)) * 100}%`;
  const y = row === 0 ? "0%" : row === size - 1 ? "100%" : `${(row / (size - 1)) * 100}%`;

  return `${x} ${y}`;
};

export const getAllTileBackgroundPositions = (gridSize: number): string[] =>
  Array.from({ length: gridSize * gridSize }, (_, index) =>
    getTileBackgroundPosition(index, gridSize)
  );

