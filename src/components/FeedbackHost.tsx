import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  subscribeFeedback,
  type FeedbackEvent,
  type ToastKind,
} from '@/src/domain/feedbackBus';
import { colors } from '@/src/theme/colors';

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

/**
 * Host nativo para toasts/alertas/confirmaciones (en web usa Notiflix vía feedback.web.ts).
 */
export function FeedbackHost() {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [report, setReport] = useState<Extract<
    FeedbackEvent,
    { type: 'report' }
  > | null>(null);
  const [confirm, setConfirm] = useState<Extract<
    FeedbackEvent,
    { type: 'confirm' }
  > | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    return subscribeFeedback((event) => {
      if (event.type === 'toast') {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, kind: event.kind, message: event.message }]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((item) => item.id !== id));
        }, 3200);
        return;
      }
      if (event.type === 'report') {
        setReport(event);
        return;
      }
      if (event.type === 'confirm') {
        setConfirm(event);
      }
    });
  }, []);

  if (Platform.OS === 'web') return null;

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.toastStack, { top: insets.top + 12 }]}>
        {toasts.map((toast) => (
          <View
            key={toast.id}
            style={[styles.toast, toastTone(toast.kind)]}>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        ))}
      </View>

      <Modal visible={!!report} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{report?.title}</Text>
            {report?.message ? (
              <Text style={styles.cardBody}>{report.message}</Text>
            ) : null}
            <Pressable
              style={[styles.okBtn, reportTone(report?.kind)]}
              onPress={() => {
                const cb = report?.onPress;
                setReport(null);
                cb?.();
              }}>
              <Text style={styles.okText}>{report?.button ?? 'Entendido'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!confirm} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{confirm?.title}</Text>
            <Text style={styles.cardBody}>{confirm?.message}</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.btn, styles.cancelBtn]}
                onPress={() => {
                  const cb = confirm?.onCancel;
                  setConfirm(null);
                  cb?.();
                }}>
                <Text style={styles.cancelText}>
                  {confirm?.cancelLabel ?? 'Cancelar'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.okBtnFlex]}
                onPress={() => {
                  const cb = confirm?.onConfirm;
                  setConfirm(null);
                  cb?.();
                }}>
                <Text style={styles.okText}>{confirm?.okLabel ?? 'OK'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function toastTone(kind: ToastKind) {
  switch (kind) {
    case 'success':
      return { backgroundColor: colors.success };
    case 'failure':
      return { backgroundColor: colors.danger };
    case 'warning':
      return { backgroundColor: colors.warning };
    default:
      return { backgroundColor: colors.accent };
  }
}

function reportTone(kind?: ToastKind) {
  switch (kind) {
    case 'success':
      return { backgroundColor: colors.success };
    case 'failure':
      return { backgroundColor: colors.danger };
    case 'warning':
      return { backgroundColor: colors.warning };
    default:
      return { backgroundColor: colors.primary };
  }
}

const styles = StyleSheet.create({
  toastStack: {
    position: 'absolute',
    right: 16,
    left: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  toastText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: '#fff',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(24, 51, 37, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: colors.ink,
    marginBottom: 8,
  },
  cardBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    marginBottom: 16,
  },
  okBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  okText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#D5DBD0',
  },
  cancelText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: colors.ink,
  },
  okBtnFlex: {
    backgroundColor: colors.primary,
  },
});
