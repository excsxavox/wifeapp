export type ToastKind = 'success' | 'failure' | 'warning' | 'info';

export type FeedbackEvent =
  | { type: 'toast'; kind: ToastKind; message: string }
  | {
      type: 'report';
      kind: ToastKind;
      title: string;
      message: string;
      button?: string;
      onPress?: () => void;
    }
  | {
      type: 'confirm';
      title: string;
      message: string;
      okLabel: string;
      cancelLabel: string;
      onConfirm: () => void;
      onCancel?: () => void;
    };

type Listener = (event: FeedbackEvent) => void;

const listeners = new Set<Listener>();

export function emitFeedback(event: FeedbackEvent) {
  listeners.forEach((listener) => listener(event));
}

export function subscribeFeedback(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
