import Notiflix from 'notiflix';

const { Confirm, Notify, Report } = Notiflix;

const BRAND = {
  success: '#3B7050',
  failure: '#BD6655',
  warning: '#BA7544',
  info: '#E89555',
  primary: '#FFB27A',
  bg: '#FBF6F1',
  ink: '#3A2A1F',
};

let initialized = false;

function ensureInit() {
  if (initialized) return;
  initialized = true;

  Notify.init({
    width: '320px',
    position: 'right-top',
    distance: '16px',
    opacity: 1,
    borderRadius: '12px',
    timeout: 3200,
    messageMaxLength: 220,
    cssAnimationStyle: 'from-right',
    fontFamily: 'DM Sans, Manrope, system-ui, sans-serif',
    fontSize: '14px',
    success: { background: BRAND.success, textColor: '#fff' },
    failure: { background: BRAND.failure, textColor: '#fff' },
    warning: { background: BRAND.warning, textColor: '#fff' },
    info: { background: BRAND.info, textColor: '#fff' },
  });

  Report.init({
    backgroundColor: BRAND.bg,
    borderRadius: '16px',
    titleFontSize: '18px',
    messageFontSize: '14px',
    buttonFontSize: '14px',
    cssAnimationStyle: 'zoom',
    fontFamily: 'DM Sans, Manrope, system-ui, sans-serif',
    success: {
      svgColor: BRAND.success,
      titleColor: BRAND.ink,
      messageColor: BRAND.ink,
      buttonBackground: BRAND.success,
      buttonColor: '#fff',
    },
    failure: {
      svgColor: BRAND.failure,
      titleColor: BRAND.ink,
      messageColor: BRAND.ink,
      buttonBackground: BRAND.failure,
      buttonColor: '#fff',
    },
    warning: {
      svgColor: BRAND.warning,
      titleColor: BRAND.ink,
      messageColor: BRAND.ink,
      buttonBackground: BRAND.warning,
      buttonColor: '#fff',
    },
    info: {
      svgColor: BRAND.info,
      titleColor: BRAND.ink,
      messageColor: BRAND.ink,
      buttonBackground: BRAND.primary,
      buttonColor: BRAND.ink,
    },
  });

  Confirm.init({
    backgroundColor: BRAND.bg,
    borderRadius: '16px',
    titleColor: BRAND.ink,
    messageColor: BRAND.ink,
    okButtonBackground: BRAND.primary,
    okButtonColor: BRAND.ink,
    cancelButtonBackground: '#E8DDD4',
    cancelButtonColor: BRAND.ink,
    fontFamily: 'DM Sans, Manrope, system-ui, sans-serif',
    titleFontSize: '17px',
    messageFontSize: '14px',
    buttonsFontSize: '14px',
    cssAnimationStyle: 'zoom',
  });
}

export function toastSuccess(message: string) {
  ensureInit();
  Notify.success(message);
}

export function toastFailure(message: string) {
  ensureInit();
  Notify.failure(message);
}

export function toastWarning(message: string) {
  ensureInit();
  Notify.warning(message);
}

export function toastInfo(message: string) {
  ensureInit();
  Notify.info(message);
}

export function alertSuccess(
  title: string,
  message = '',
  button = 'Entendido',
  onPress?: () => void
) {
  ensureInit();
  Report.success(title, message || ' ', button, onPress);
}

export function alertFailure(
  title: string,
  message = '',
  button = 'Entendido',
  onPress?: () => void
) {
  ensureInit();
  Report.failure(title, message || ' ', button, onPress);
}

export function alertWarning(
  title: string,
  message = '',
  button = 'Entendido',
  onPress?: () => void
) {
  ensureInit();
  Report.warning(title, message || ' ', button, onPress);
}

export function alertInfo(
  title: string,
  message = '',
  button = 'Entendido',
  onPress?: () => void
) {
  ensureInit();
  Report.info(title, message || ' ', button, onPress);
}

/** Reemplazo de Alert.alert simple (título + mensaje opcional). */
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
  ensureInit();
  Confirm.show(
    title,
    message,
    confirmLabel,
    cancelLabel,
    () => {
      void Promise.resolve(onConfirm()).catch((error) => {
        console.warn('confirmAction failed', error);
        toastFailure(
          error instanceof Error ? error.message : 'No se pudo completar'
        );
      });
    },
    undefined,
    {
      okButtonBackground:
        /eliminar|borrar|cerrar|salir|destructive/i.test(confirmLabel)
          ? BRAND.failure
          : BRAND.primary,
    }
  );
}
