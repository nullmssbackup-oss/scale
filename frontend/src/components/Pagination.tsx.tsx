interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 text-sm bg-white dark:bg-gray-800 border rounded-md disabled:opacity-50"
      >
        Anterior
      </button>
      <span className="text-sm text-gray-700 dark:text-gray-300">
        Página {currentPage} de {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 text-sm bg-white dark:bg-gray-800 border rounded-md disabled:opacity-50"
      >
        Próxima
      </button>
    </div>
  );
}