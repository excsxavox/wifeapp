import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { BudgetBar } from '@/src/components/BudgetBar';
import { Field } from '@/src/components/Field';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { useBudget } from '@/src/context/BudgetContext';
import { formatMoney, parseAmount } from '@/src/domain/money';
import { getCompanionAvatar } from '@/src/theme/companions';
import { colors } from '@/src/theme/colors';
import { GOAL_ICONS, normalizeGoalIcon } from '@/src/theme/goalIcons';

const GOAL_COLORS = ['#3B7050', '#88A2B0', '#BDA65F', '#B594AD', '#9B9F85'];

const TEMPLATES = [
  {
    id: 'viaje',
    label: 'Viaje',
    name: 'Mi próximo viaje',
    icon: '✈️' as const,
    color: '#3B7050',
    target: '1000',
  },
  {
    id: 'emergencias',
    label: 'Emergencias',
    name: 'Fondo de emergencias',
    icon: '🛟' as const,
    color: '#BDA65F',
    target: '500',
  },
  {
    id: 'estudios',
    label: 'Estudios',
    name: 'Estudios',
    icon: '🎓' as const,
    color: '#88A2B0',
    target: '800',
  },
] as const;

const HORIZONS = [
  { id: 'none', label: 'Sin fecha', months: null },
  { id: '3', label: 'En 3 meses', months: 3 },
  { id: '6', label: 'En 6 meses', months: 6 },
  { id: '12', label: 'En 1 año', months: 12 },
] as const;

type Mode = 'list' | 'form';

export default function MetasScreen() {
  const router = useRouter();
  const {
    savingsGoals,
    settings,
    totalBudget,
    totalSpent,
    saveGoal,
    contributeToGoal,
    removeGoal,
  } = useBudget();

  const [mode, setMode] = useState<Mode>(
    savingsGoals.length > 0 ? 'list' : 'form'
  );
  const [templateId, setTemplateId] = useState<string>('viaje');
  const [name, setName] = useState('Mi próximo viaje');
  const [target, setTarget] = useState('1000');
  const [saved, setSaved] = useState('0');
  const [color, setColor] = useState(GOAL_COLORS[0]);
  const [icon, setIcon] = useState(normalizeGoalIcon('✈️'));
  const [horizonId, setHorizonId] = useState<string>('none');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [contribution, setContribution] = useState('');
  const [busy, setBusy] = useState(false);

  const available = Math.max(0, totalBudget - totalSpent);
  const role = settings.companionRole ?? 'esposa';

  const targetAmountPreview = parseAmount(target) ?? 0;
  const savedAmountPreview = Math.max(0, parseAmount(saved) ?? 0);
  const remainingPreview = Math.max(0, targetAmountPreview - savedAmountPreview);
  const percentPreview =
    targetAmountPreview > 0
      ? Math.min(100, (savedAmountPreview / targetAmountPreview) * 100)
      : 0;

  const targetDate = useMemo(() => {
    const horizon = HORIZONS.find((h) => h.id === horizonId);
    if (!horizon?.months) return null;
    const date = new Date();
    date.setMonth(date.getMonth() + horizon.months);
    return date.toISOString().slice(0, 10);
  }, [horizonId]);

  const applyTemplate = (id: string) => {
    const template = TEMPLATES.find((item) => item.id === id);
    if (!template) return;
    setTemplateId(template.id);
    setName(template.name);
    setIcon(template.icon);
    setColor(template.color);
    if (!editingId) {
      setTarget(template.target);
      setSaved('0');
    }
  };

  const startNew = () => {
    setEditingId(null);
    setTemplateId('viaje');
    setName('Mi próximo viaje');
    setTarget('1000');
    setSaved('0');
    setColor(GOAL_COLORS[0]);
    setIcon('✈️');
    setHorizonId('none');
    setContribution('');
    setMode('form');
  };

  const loadGoal = (id: number) => {
    const goal = savingsGoals.find((g) => g.id === id);
    if (!goal) return;
    setEditingId(goal.id);
    setName(goal.name);
    setTarget(String(goal.targetAmount));
    setSaved(String(goal.savedAmount));
    setColor(goal.color);
    setIcon(normalizeGoalIcon(goal.icon));
    setContribution('');
    const matched = TEMPLATES.find(
      (t) => t.name === goal.name || t.icon === goal.icon
    );
    setTemplateId(matched?.id ?? 'viaje');
    setHorizonId('none');
    setMode('form');
  };

  const parseNonNegative = (raw: string) => {
    const normalized = raw.replace(',', '.').replace(/[^\d.]/g, '');
    if (!normalized) return 0;
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 0) return null;
    return Math.round(value * 100) / 100;
  };

  const submit = async () => {
    const targetAmount = parseAmount(target);
    const savedAmount = parseNonNegative(saved);
    if (!name.trim()) {
      Alert.alert('Ponle un nombre', 'Ejemplo: Mi próximo viaje');
      return;
    }
    if (targetAmount == null || targetAmount <= 0) {
      Alert.alert('Monto objetivo', 'Escribe cuánto quieres juntar.');
      return;
    }
    if (savedAmount == null) {
      Alert.alert('Monto inválido', 'El ahorrado no puede ser negativo.');
      return;
    }
    if (savedAmount > targetAmount) {
      Alert.alert(
        'Revisa los montos',
        'Lo ya ahorrado no puede ser mayor que el objetivo.'
      );
      return;
    }

    setBusy(true);
    try {
      const goal = await saveGoal({
        id: editingId ?? undefined,
        name,
        targetAmount,
        savedAmount,
        color,
        icon: normalizeGoalIcon(icon),
        targetDate,
      });
      setEditingId(goal.id);
      setSaved(String(goal.savedAmount));
      Alert.alert(
        editingId ? 'Meta actualizada' : '¡Meta creada!',
        `«${name.trim()}» ya aparece en el inicio.`
      );
      setMode('list');
    } finally {
      setBusy(false);
    }
  };

  const addContribution = async () => {
    if (editingId == null) return;
    const amount = parseAmount(contribution);
    if (amount == null || amount <= 0) {
      Alert.alert('Monto inválido', 'Escribe cuánto quieres aportar.');
      return;
    }
    setBusy(true);
    try {
      await contributeToGoal(editingId, amount);
      const next = (parseAmount(saved) ?? 0) + amount;
      setSaved(String(next));
      setContribution('');
      Alert.alert(
        'Aporte registrado',
        `Sumaste ${formatMoney(amount, settings.currency)}.`
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (editingId == null) return;
    Alert.alert('Eliminar meta', `¿Borrar «${name}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await removeGoal(editingId);
          startNew();
          if (savingsGoals.length <= 1) setMode('form');
          else setMode('list');
        },
      },
    ]);
  };

  if (mode === 'list') {
    return (
      <Screen
        title="Tus metas"
        subtitle="Elige una para editar o crea una nueva."
        showBrand={false}
        right={
          <Pressable style={styles.currencyBadge}>
            <Text style={styles.currencyText}>{settings.currency}</Text>
          </Pressable>
        }>
        {savingsGoals.map((goal) => {
          const percent =
            goal.targetAmount > 0
              ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100)
              : 0;
          const left = Math.max(0, goal.targetAmount - goal.savedAmount);
          return (
            <Pressable
              key={goal.id}
              style={styles.goalCard}
              onPress={() => loadGoal(goal.id)}>
              <View
                style={[styles.goalIcon, { backgroundColor: `${goal.color}22` }]}>
                <Text style={styles.goalIconText}>{goal.icon || '🎯'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalName}>{goal.name}</Text>
                <Text style={styles.goalMeta}>
                  {formatMoney(goal.savedAmount, settings.currency)} de{' '}
                  {formatMoney(goal.targetAmount, settings.currency)}
                </Text>
                <View style={{ marginTop: 8 }}>
                  <BudgetBar percent={percent} color={goal.color} height={8} />
                </View>
                <Text style={styles.goalRemain}>
                  {left <= 0
                    ? '¡Meta lograda!'
                    : `Te faltan ${formatMoney(left, settings.currency)}`}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          );
        })}

        <PrimaryButton label="+ Crear meta" onPress={startNew} />
        <PrimaryButton
          label="Volver"
          variant="secondary"
          onPress={() => router.back()}
          style={{ marginTop: 10 }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title={editingId ? 'Editar meta' : 'Crear meta'}
      subtitle="Dale un propósito a tu ahorro"
      showBrand={false}
      right={
        <Pressable style={styles.currencyBadge}>
          <Text style={styles.currencyText}>{settings.currency}</Text>
        </Pressable>
      }>
      <Text style={styles.heroTitle}>¿Qué quieres lograr?</Text>
      <Text style={styles.heroSub}>Vamos paso a paso. Tú eliges la meta.</Text>

      <View style={styles.coachBanner}>
        <Image
          source={getCompanionAvatar(role, 'friendly')}
          style={styles.coachAvatar}
          resizeMode="contain"
        />
        <Text style={styles.coachText}>
          Empieza con una plantilla o escribe la tuya. Verás la vista previa
          abajo antes de guardar.
        </Text>
      </View>

      {savingsGoals.length > 0 ? (
        <Pressable onPress={() => setMode('list')} style={styles.backToList}>
          <Text style={styles.backToListText}>← Ver mis metas</Text>
        </Pressable>
      ) : null}

      <Field
        label="Nombre de tu meta"
        value={name}
        onChangeText={setName}
        placeholder="Mi próximo viaje"
      />

      <View style={styles.chips}>
        {TEMPLATES.map((template) => {
          const active = templateId === template.id;
          return (
            <Pressable
              key={template.id}
              onPress={() => applyTemplate(template.id)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={styles.chipIcon}>{template.icon}</Text>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {template.label}
              </Text>
              {active ? <Text style={styles.chipCheck}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.amountRow}>
        <View style={styles.amountCol}>
          <Field
            label="Monto objetivo"
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            placeholder="1000"
          />
        </View>
        <View style={styles.amountCol}>
          <Field
            label="Ya tengo ahorrado"
            value={saved}
            onChangeText={setSaved}
            keyboardType="decimal-pad"
            placeholder="0"
            hint="Puedes empezar desde $0."
          />
        </View>
      </View>

      <Text style={styles.sectionLabel}>Fecha objetivo · Opcional</Text>
      <View style={styles.chips}>
        {HORIZONS.map((horizon) => {
          const active = horizonId === horizon.id;
          return (
            <Pressable
              key={horizon.id}
              onPress={() => setHorizonId(horizon.id)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {horizon.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Icono de la meta</Text>
      <Text style={styles.iconsHint}>Elige uno de estos 10 iconos.</Text>
      <View style={styles.iconsGrid}>
        {GOAL_ICONS.map((option) => (
          <Pressable
            key={option}
            onPress={() => setIcon(option)}
            style={[
              styles.iconChip,
              icon === option && styles.iconChipActive,
            ]}>
            <Text style={styles.chipIcon}>{option}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Color</Text>
      <View style={styles.customizeRow}>
        <View style={[styles.iconPreview, { backgroundColor: `${color}33` }]}>
          <Text style={styles.iconPreviewText}>{icon}</Text>
        </View>
        <View style={styles.colors}>
          {GOAL_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                color === c && styles.colorDotActive,
              ]}>
              {color === c ? <Text style={styles.colorCheck}>✓</Text> : null}
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.previewTitle}>Así se verá tu meta</Text>
      <View style={styles.previewCard}>
        <View style={styles.previewTop}>
          <View style={[styles.goalIcon, { backgroundColor: `${color}22` }]}>
            <Text style={styles.goalIconText}>{icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.goalName}>{name.trim() || 'Tu meta'}</Text>
            <Text style={styles.goalMeta}>
              {formatMoney(savedAmountPreview, settings.currency)} de{' '}
              {formatMoney(targetAmountPreview, settings.currency)}
            </Text>
          </View>
          <Text style={styles.previewPct}>{Math.round(percentPreview)}%</Text>
        </View>
        <BudgetBar percent={percentPreview} color={color} height={10} />
        <Text style={styles.goalRemain}>
          {remainingPreview <= 0
            ? '¡Meta lograda!'
            : `Te faltan ${formatMoney(remainingPreview, settings.currency)}`}
        </Text>
      </View>

      <PrimaryButton
        label={
          busy
            ? 'Guardando…'
            : editingId
              ? 'Guardar cambios'
              : 'Crear meta'
        }
        onPress={submit}
        disabled={busy}
      />
      <Text style={styles.footerHint}>Podrás editarla cuando quieras</Text>

      {editingId ? (
        <View style={styles.contributeCard}>
          <Text style={styles.sectionLabel}>Aportar ahora</Text>
          <Text style={styles.contributeHint}>
            Este mes te quedan{' '}
            <Text style={styles.bold}>
              {formatMoney(available, settings.currency)}
            </Text>{' '}
            sin gastar.
          </Text>
          <Field
            label="Monto a aportar"
            value={contribution}
            onChangeText={setContribution}
            keyboardType="decimal-pad"
            placeholder="50"
          />
          {available > 0 ? (
            <PrimaryButton
              label={`Usar ${formatMoney(available, settings.currency)} disponible`}
              variant="subtle"
              onPress={() => setContribution(String(available))}
              style={{ marginBottom: 10 }}
            />
          ) : null}
          <PrimaryButton
            label={busy ? 'Guardando…' : 'Registrar aporte'}
            variant="lime"
            onPress={addContribution}
            disabled={busy}
          />
          <PrimaryButton
            label="Eliminar meta"
            variant="danger"
            onPress={confirmDelete}
            style={{ marginTop: 10 }}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  currencyBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  currencyText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    color: colors.ink,
  },
  heroTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 26,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  heroSub: {
    marginTop: 4,
    marginBottom: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: colors.inkMuted,
  },
  coachBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E7F0D8',
    borderRadius: 18,
    paddingVertical: 10,
    paddingLeft: 8,
    paddingRight: 14,
    marginBottom: 16,
    minHeight: 84,
  },
  coachAvatar: {
    width: 72,
    height: 72,
  },
  coachText: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
  },
  backToList: {
    marginBottom: 10,
  },
  backToListText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: colors.primaryMid,
  },
  sectionLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: colors.ink,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipIcon: {
    fontSize: 14,
  },
  chipLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.inkMuted,
  },
  chipLabelActive: {
    color: colors.ink,
    fontFamily: 'DMSans_700Bold',
  },
  chipCheck: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    color: colors.primary,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 10,
  },
  amountCol: {
    flex: 1,
  },
  iconsHint: {
    marginTop: -4,
    marginBottom: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkMuted,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  customizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  iconPreview: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPreviewText: {
    fontSize: 24,
  },
  colors: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: colors.ink,
  },
  colorCheck: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
  },
  iconChip: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  previewTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: colors.ink,
    marginBottom: 10,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  previewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  previewPct: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: colors.inkMuted,
  },
  footerHint: {
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkMuted,
  },
  contributeCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 8,
  },
  contributeHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: 10,
    lineHeight: 18,
  },
  bold: {
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  goalIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIconText: {
    fontSize: 20,
  },
  goalName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: colors.ink,
  },
  goalMeta: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.inkMuted,
  },
  goalRemain: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: '#6F7F5F',
  },
  chevron: {
    fontSize: 22,
    color: '#A3AD97',
  },
});
