import fs from 'fs';

const files = [
  'app/login.tsx',
  'app/metas.tsx',
  'app/onboarding.tsx',
  'app/gate.tsx',
  'app/apps-vigiladas.tsx',
  'app/ajustes.tsx',
  'app/(tabs)/registrar.tsx',
  'app/(tabs)/presupuesto.tsx',
  'app/(tabs)/historial.tsx',
  'app/perfil.tsx',
];

const feedbackImport =
  "import { alertFailure, alertInfo, alertSuccess, alertWarning, confirmAction, showAlert, toastFailure, toastInfo, toastSuccess, toastWarning } from '@/src/domain/feedback';";

function stripAlertFromRnImport(source) {
  return source.replace(/import \{([^}]*)\} from 'react-native';/g, (match, group) => {
    if (!group.includes('Alert')) return match;
    const parts = group
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((x) => x !== 'Alert');
    return parts.length ? `import { ${parts.join(', ')} } from 'react-native';` : '';
  });
}

function ensureFeedbackImport(source) {
  if (source.includes("from '@/src/domain/feedback'")) return source;
  if (source.includes("from '@/src/domain/confirm'")) {
    return source.replace(
      "import { confirmAction } from '@/src/domain/confirm';",
      feedbackImport
    );
  }
  if (/import \{[^}]*\} from 'react-native';/.test(source)) {
    return source.replace(/import \{[^}]*\} from 'react-native';/, (match) => {
      return `${match}\n${feedbackImport}`;
    });
  }
  return `${feedbackImport}\n${source}`;
}

function replaceAlerts(source) {
  // Confirm dialogs with Cancel + action
  source = source.replace(
    /Alert\.alert\(\s*'([^']+)',\s*'([^']*)',\s*\[\s*\{\s*text:\s*'Cancelar',\s*style:\s*'cancel'\s*\},\s*\{\s*text:\s*'([^']+)',\s*style:\s*'destructive',\s*onPress:\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*\},\s*\]\s*\)/g,
    (_m, title, message, ok, body) =>
      `confirmAction(\n      '${title}',\n      '${message}',\n      '${ok}',\n      async () => {${body}}\n    )`
  );

  source = source.replace(
    /Alert\.alert\(\s*'([^']+)',\s*`([^`]*)`,\s*\[\s*\{\s*text:\s*'Cancelar',\s*style:\s*'cancel'\s*\},\s*\{\s*text:\s*'([^']+)',\s*style:\s*'destructive',\s*onPress:\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*\},\s*\]\s*\)/g,
    (_m, title, message, ok, body) =>
      `confirmAction(\n      '${title}',\n      \`${message}\`,\n      '${ok}',\n      async () => {${body}}\n    )`
  );

  // Generic Alert.alert(title, message) or Alert.alert(title)
  source = source.replace(
    /Alert\.alert\(\s*((?:'[^']*'|`[^`]*`|[A-Za-z0-9_?.]+(?:\([^)]*\))?))\s*(?:,\s*((?:'[^']*'|`[^`]*`|[A-Za-z0-9_?.]+(?:\([^)]*\))?)|[\s\S]*?))?\s*\)/g,
    (match, title, message) => {
      if (match.includes('[')) return match; // leave complex button arrays for manual
      if (message != null && message.trim()) {
        return `showAlert(${title}, ${message})`;
      }
      return `showAlert(${title})`;
    }
  );

  return source;
}

for (const file of files) {
  let source = fs.readFileSync(file, 'utf8');
  source = stripAlertFromRnImport(source);
  source = ensureFeedbackImport(source);
  source = replaceAlerts(source);
  fs.writeFileSync(file, source);
  const left = (source.match(/Alert\.alert/g) || []).length;
  console.log(`${file}: remaining Alert.alert = ${left}`);
}
