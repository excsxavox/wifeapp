import { emitFeedback } from '@/src/domain/feedbackBus';

export function toastSuccess(message: string) {
  emitFeedback({ type: 'toast', kind: 'success', message });
}

export function toastFailure(message: string) {
  emitFeedback({ type: 'toast', kind: 'failure', message });
}

export function toastWarning(message: string) {
  emitFeedback({ type: 'toast', kind: 'warning', message });
}

export function toastInfo(message: string) {
  emitFeedback({ type: 'toast', kind: 'info', message });
}

export function alertSuccess(
  title: string,
  message = '',
  button = 'Entendido',
  onPress?: () => void
) {
  emitFeedback({
    type: 'report',
    kind: 'success',
    title,
    message,
    button,
    onPress,
  });
}

export function alertFailure(
  title: string,
  message = '',
  button = 'Entendido',
  onPress?: () => void
) {
  emitFeedback({
    type: 'report',
    kind: 'failure',
    title,
    message,
    button,
    onPress,
  });
}

export function alertWarning(
  title: string,
  message = '',
  button = 'Entendido',
  onPress?: () => void
) {
  emitFeedback({
    type: 'report',
    kind: 'warning',
    title,
    message,
    button,
    onPress,
  });
}

export function alertInfo(
  title: string,
  message = '',
  button = 'Entendido',
  onPress?: () => void
) {
  emitFeedback({
    type: 'report',
    kind: 'info',
    title,
    message,
    button,
    onPress,
  });
}

export function showAlert(title: string, message?: string) {
  if (message) {
    alertInfo(title, message);
    return;
  }
  toastInfo(title);
}

export function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void | Promise<void>,
  cancelLabel = 'Cancelar'
): void {
  emitFeedback({
    type: 'confirm',
    title,
    message,
    okLabel: confirmLabel,
    cancelLabel,
    onConfirm: () => {
      void Promise.resolve(onConfirm()).catch((error) => {
        console.warn('confirmAction failed', error);
        toastFailure(
          error instanceof Error ? error.message : 'No se pudo completar'
        );
      });
    },
  });
}
