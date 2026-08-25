import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm border rounded-md dark:border-gray-600">Cancelar</button>
        <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Confirmar</button>
      </div>
    </Modal>
  );
}
