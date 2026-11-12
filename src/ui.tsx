import { Check, ChevronDown, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageStyle,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { pickImage, usePhoto } from './media';
import { c, font, radius, WIDE } from './theme';
import { brToIso, MONTHS, parseNum } from './utils';
import { VideoInput } from './video';

export const useWide = () => useWindowDimensions().width >= WIDE;

/* ---------- Texto ---------- */

type Variant = 'title' | 'h2' | 'body' | 'small' | 'label' | 'figure';
const variants: Record<Variant, TextStyle> = {
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4, color: c.ink },
  h2: { fontSize: 16, fontWeight: '700', color: c.ink },
  body: { fontSize: 14.5, color: c.ink, lineHeight: 21 },
  small: { fontSize: 12.5, color: c.muted, lineHeight: 18 },
  label: { fontSize: 12.5, fontWeight: '600', color: c.muted },
  figure: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, color: c.ink, fontVariant: ['tabular-nums'] },
};

export function T({ v = 'body', style, ...rest }: { v?: Variant; style?: StyleProp<TextStyle>; children?: React.ReactNode; numberOfLines?: number }) {
  return <Text {...rest} style={[{ fontFamily: font }, variants[v], style]} />;
}

/* ---------- Blocos ---------- */

export function Card({ children, style, pad = 16 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; pad?: number }) {
  return <View style={[s.card, { padding: pad }, style]}>{children}</View>;
}

export function Section({ title, right, children, style }: { title: string; right?: React.ReactNode; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Card style={style} pad={0}>
      <View style={s.sectionHead}>
        <T v="h2">{title}</T>
        {right}
      </View>
      <View style={{ padding: 16, paddingTop: 4 }}>{children}</View>
    </Card>
  );
}

type Tone = 'neutral' | 'green' | 'yellow' | 'blue' | 'red';
const tones: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: c.surfaceAlt, fg: c.muted },
  green: { bg: c.primarySoft, fg: c.primaryDark },
  yellow: { bg: c.harvestSoft, fg: c.harvestInk },
  blue: { bg: c.sellSoft, fg: '#1B5688' },
  red: { bg: c.dangerSoft, fg: c.danger },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <View style={[s.badge, { backgroundColor: tones[tone].bg }]}>
      <Text style={{ fontFamily: font, fontSize: 12, fontWeight: '600', color: tones[tone].fg }}>{label}</Text>
    </View>
  );
}

export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

export function Btn({
  label,
  onPress,
  kind = 'primary',
  icon,
  small,
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  icon?: React.ReactNode;
  small?: boolean;
  disabled?: boolean;
}) {
  const bg = kind === 'primary' ? c.primary : kind === 'danger' ? c.danger : 'transparent';
  const fg = kind === 'ghost' ? c.ink : '#fff';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        small && { paddingVertical: 7, paddingHorizontal: 11 },
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        kind === 'ghost' && { borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
      ]}
    >
      {icon}
      <Text style={{ fontFamily: font, color: fg, fontWeight: '600', fontSize: small ? 13 : 14 }}>{label}</Text>
    </Pressable>
  );
}

export function IconBtn({ onPress, label, children }: { onPress: () => void; label: string; children: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => [s.iconBtn, pressed && { backgroundColor: c.surfaceAlt }]}>
      {children}
    </Pressable>
  );
}

export function Empty({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20, gap: 6 }}>
      <T v="h2">{title}</T>
      <T v="small" style={{ textAlign: 'center', maxWidth: 380 }}>{hint}</T>
      {action ? <View style={{ marginTop: 10 }}>{action}</View> : null}
    </View>
  );
}

export function Stat({ label, value, note, tone }: { label: string; value: React.ReactNode; note?: string; tone?: 'good' | 'bad' }) {
  return (
    <Card style={{ flex: 1, minWidth: 150 }}>
      <T v="label">{label}</T>
      {typeof value === 'string' ? <T v="figure" style={[{ marginTop: 6 }, tone === 'good' && { color: c.primary }, tone === 'bad' && { color: c.danger }]}>{value}</T> : <View style={{ marginTop: 6 }}>{value}</View>}
      {note ? <T v="small" style={{ marginTop: 2 }}>{note}</T> : null}
    </Card>
  );
}

export function Segmented<V extends string>({ value, options, onChange }: { value: V; options: { value: V; label: string }[]; onChange: (v: V) => void }) {
  return (
    <View style={s.segmented}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="button" onPress={() => onChange(o.value)} style={[s.segment, on && { backgroundColor: c.surface, borderColor: c.line }]}>
            <Text style={{ fontFamily: font, fontSize: 13, fontWeight: '600', color: on ? c.ink : c.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Tela ---------- */

export function Screen({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  const wide = useWide();
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 260, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [enter]);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: wide ? 28 : 16, paddingBottom: wide ? 48 : 96 }} keyboardShouldPersistTaps="handled">
      <Animated.View style={{ width: '100%', maxWidth: 1180, alignSelf: 'center', gap: 16, opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <View style={{ flexShrink: 1, minWidth: 210 }}>
            <T v="title">{title}</T>
            {subtitle ? <T v="small" style={{ marginTop: 2, fontSize: 13.5 }}>{subtitle}</T> : null}
          </View>
          {action}
        </View>
        {children}
      </Animated.View>
    </ScrollView>
  );
}

/* ---------- Fotos ---------- */

export function Photo({ uri, style, fallback }: { uri?: string; style?: StyleProp<ImageStyle>; fallback?: React.ReactNode }) {
  const src = usePhoto(uri);
  if (!src) return <View style={[{ backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }, style as StyleProp<ViewStyle>]}>{fallback}</View>;
  return <Image source={{ uri: src }} style={[{ backgroundColor: c.surfaceAlt }, style]} resizeMode="cover" />;
}

function PhotoInput({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const [busy, setBusy] = useState(false);
  const choose = async () => {
    setBusy(true);
    try {
      const picked = await pickImage();
      if (picked) onChange(picked);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Escolher imagem" onPress={choose}>
        <Photo uri={value} style={{ width: 96, height: 72, borderRadius: radius.md, borderWidth: 1, borderColor: c.line }} fallback={<ImagePlus size={24} color={c.primaryDark} />} />
      </Pressable>
      <View style={{ flex: 1, gap: 6, alignItems: 'flex-start' }}>
        <Btn small kind="ghost" label={busy ? 'Abrindo…' : value ? 'Trocar imagem' : 'Escolher imagem'} onPress={choose} disabled={busy} />
        {value ? <Btn small kind="ghost" label="Remover" onPress={() => onChange(undefined)} /> : <T v="small">Da galeria do celular ou de uma pasta do computador.</T>}
      </View>
    </View>
  );
}

/* ---------- Ficha com foto grande e especificações ---------- */

export function DetailSheet({
  visible,
  title,
  subtitle,
  photo,
  fallback,
  media,
  rows,
  children,
  onEdit,
  onDelete,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  photo?: string;
  fallback?: React.ReactNode;
  /** Mostrado no topo, antes da foto (ex.: player de vídeo). */
  media?: React.ReactNode;
  rows: [string, string | undefined | null | false][];
  children?: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const wide = useWide();
  const shown = rows.filter((r) => r[1]);
  return (
    <Modal visible={visible} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={[s.backdrop, !wide && { justifyContent: 'flex-end', padding: 0 }]}>
        <View style={[s.sheet, wide ? { width: 620, maxHeight: '90%' } : { width: '100%', maxHeight: '94%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
          <ScrollView style={Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : undefined}>
            {media}
            {photo || (fallback && !media) ? <Photo uri={photo} style={{ width: '100%', aspectRatio: photo ? 16 / 10 : 16 / 5 }} fallback={fallback} /> : null}
            <View style={{ padding: 18, gap: 4 }}>
              <T v="title" style={{ fontSize: 22 }}>{title}</T>
              {subtitle ? <T v="small" style={{ fontSize: 13.5 }}>{subtitle}</T> : null}
              <View style={{ marginTop: 10 }}>
                {shown.map(([label, value]) => (
                  <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: c.line }}>
                    <T style={{ color: c.muted }}>{label}</T>
                    <T style={{ fontWeight: '600', flexShrink: 1, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{value}</T>
                  </View>
                ))}
              </View>
              {children}
            </View>
          </ScrollView>
          <View style={[s.sheetFoot, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {onEdit ? <Btn small kind="ghost" label="Editar" icon={<Pencil size={14} color={c.ink} />} onPress={onEdit} /> : null}
              {onDelete ? <Btn small kind="ghost" label="Excluir" icon={<Trash2 size={14} color={c.danger} />} onPress={onDelete} /> : null}
            </View>
            <Btn small label="Fechar" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const AddBtn = ({ label, onPress }: { label: string; onPress: () => void }) => <Btn label={label} onPress={onPress} icon={<Plus size={16} color="#fff" />} />;

/* ---------- Lista de dados: tabela no desktop, cartões no celular ---------- */

export interface Column<R> {
  label: string;
  flex?: number;
  align?: 'left' | 'right';
  render: (row: R) => React.ReactNode;
}

const cell = (node: React.ReactNode, style?: StyleProp<TextStyle>) =>
  typeof node === 'string' || typeof node === 'number' ? <T style={style} numberOfLines={2}>{node}</T> : node;

export function DataList<R extends { id: string }>({
  rows,
  columns,
  onEdit,
  onDelete,
  actions,
}: {
  rows: R[];
  columns: Column<R>[];
  onEdit?: (row: R) => void;
  onDelete?: (row: R) => void;
  actions?: (row: R) => React.ReactNode;
}) {
  const wide = useWide();
  const tools = (row: R) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {actions?.(row)}
      {onEdit ? <IconBtn label="Editar" onPress={() => onEdit(row)}><Pencil size={16} color={c.muted} /></IconBtn> : null}
      {onDelete ? <IconBtn label="Excluir" onPress={() => onDelete(row)}><Trash2 size={16} color={c.danger} /></IconBtn> : null}
    </View>
  );

  if (wide) {
    return (
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <View style={[s.row, { backgroundColor: c.surfaceAlt, borderTopWidth: 0, paddingVertical: 10 }]}>
          {columns.map((col) => (
            <View key={col.label} style={{ flex: col.flex ?? 1, alignItems: col.align === 'right' ? 'flex-end' : 'flex-start', paddingRight: col.align === 'right' ? 28 : 8 }}>
              <T v="label">{col.label}</T>
            </View>
          ))}
          <View style={{ width: 150 }} />
        </View>
        {rows.map((row) => (
          <View key={row.id} style={s.row}>
            {columns.map((col) => (
              <View key={col.label} style={{ flex: col.flex ?? 1, alignItems: col.align === 'right' ? 'flex-end' : 'flex-start', paddingRight: col.align === 'right' ? 28 : 8 }}>
                {cell(col.render(row), col.align === 'right' ? { fontVariant: ['tabular-nums'] } : undefined)}
              </View>
            ))}
            <View style={{ width: 150, alignItems: 'flex-end' }}>{tools(row)}</View>
          </View>
        ))}
      </Card>
    );
  }

  const [first, ...rest] = columns;
  return (
    <View style={{ gap: 10 }}>
      {rows.map((row) => (
        <Card key={row.id} pad={14}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1 }}>{cell(first.render(row), { fontWeight: '700', fontSize: 15.5 })}</View>
            {tools(row)}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, rowGap: 8 }}>
            {rest.map((col) => (
              <View key={col.label} style={{ width: '50%', paddingRight: 8 }}>
                <T v="small">{col.label}</T>
                <View style={{ marginTop: 1 }}>{cell(col.render(row))}</View>
              </View>
            ))}
          </View>
        </Card>
      ))}
    </View>
  );
}

/* ---------- Faixa das estações: 12 meses numa linha ---------- */

export type StripCell = 'plant' | 'grow' | 'harvest' | 'sell' | 'empty';
const stripColor: Record<StripCell, string> = { plant: c.primary, grow: c.primarySoft, harvest: c.harvest, sell: c.sell, empty: c.surfaceAlt };

export function SeasonHeader({ nowMonth }: { nowMonth?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {MONTHS.map((m, i) => (
        <View key={m} style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontFamily: font, fontSize: 11, fontWeight: nowMonth === i + 1 ? '800' : '500', color: nowMonth === i + 1 ? c.ink : c.faint }}>{m[0]}</Text>
        </View>
      ))}
    </View>
  );
}

export function SeasonStrip({ cells, nowMonth, height = 16 }: { cells: StripCell[]; nowMonth?: number; height?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {cells.map((k, i) => (
        <View key={i} style={{ flex: 1 }}>
          <View style={{ height, borderRadius: 3, backgroundColor: stripColor[k] }} />
          <View style={{ height: 3, marginTop: 2, borderRadius: 2, backgroundColor: nowMonth === i + 1 ? c.ink : 'transparent' }} />
        </View>
      ))}
    </View>
  );
}

export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: it.color }} />
          <T v="small">{it.label}</T>
        </View>
      ))}
    </View>
  );
}

/* ---------- Formulário ---------- */

export interface Option {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'month' | 'months' | 'toggle' | 'choice' | 'multiline' | 'photo' | 'video' | 'date';
  options?: Option[];
  required?: boolean;
  placeholder?: string;
  hint?: string;
  half?: boolean;
  showIf?: (values: Record<string, any>) => boolean;
}

function MonthPicker({ value, multi, onChange }: { value: number | number[]; multi?: boolean; onChange: (v: any) => void }) {
  const selected = (m: number) => (multi ? (value as number[]).includes(m) : value === m);
  const toggle = (m: number) => {
    if (!multi) return onChange(m);
    const list = value as number[];
    onChange(list.includes(m) ? list.filter((x) => x !== m) : [...list, m].sort((a, b) => a - b));
  };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {MONTHS.map((m, i) => {
        const on = selected(i + 1);
        return (
          <Pressable key={m} accessibilityRole="button" onPress={() => toggle(i + 1)} style={[s.chip, on && { backgroundColor: c.primary, borderColor: c.primary }]}>
            <Text style={{ fontFamily: font, fontSize: 13, fontWeight: '600', color: on ? '#fff' : c.ink }}>{m}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Select({ value, options, onChange, placeholder }: { value: string; options: Option[]; onChange: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View>
      <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)} style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <Text style={{ fontFamily: font, fontSize: 14.5, color: current ? c.ink : c.faint }}>{current?.label ?? placeholder ?? 'Selecione'}</Text>
        <ChevronDown size={16} color={c.muted} />
      </Pressable>
      {open ? (
        <ScrollView nestedScrollEnabled style={s.dropdown} keyboardShouldPersistTaps="handled">
          {options.length === 0 ? <T v="small" style={{ padding: 12 }}>Nada cadastrado ainda.</T> : null}
          {options.map((o) => (
            <Pressable
              key={o.value}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={({ pressed }) => [s.option, (pressed || o.value === value) && { backgroundColor: c.surfaceAlt }]}
            >
              <Text style={{ fontFamily: font, fontSize: 14.5, color: c.ink, flex: 1 }}>{o.label}</Text>
              {o.value === value ? <Check size={15} color={c.primary} /> : null}
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

export function FormSheet({
  visible,
  title,
  fields,
  initial,
  submitLabel = 'Salvar',
  onSubmit,
  onClose,
}: {
  visible: boolean;
  title: string;
  fields: FieldDef[];
  initial: Record<string, any>;
  submitLabel?: string;
  onSubmit: (values: Record<string, any>) => void;
  onClose: () => void;
}) {
  const wide = useWide();
  const [values, setValues] = useState<Record<string, any>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    const v: Record<string, any> = { ...initial };
    fields.forEach((f) => {
      if (f.type === 'number' && typeof v[f.key] === 'number') v[f.key] = String(v[f.key]).replace('.', ',');
    });
    setValues(v);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const set = (key: string, v: any) => setValues((prev) => ({ ...prev, [key]: v }));
  const shown = fields.filter((f) => !f.showIf || f.showIf(values));

  const submit = () => {
    const out: Record<string, any> = { ...values };
    const errs: Record<string, string> = {};
    shown.forEach((f) => {
      const raw = values[f.key];
      if (f.type === 'number') {
        const empty = raw === undefined || raw === null || String(raw).trim() === '';
        const n = parseNum(String(raw ?? ''));
        if (empty) {
          if (f.required) errs[f.key] = 'Preencha este campo.';
          out[f.key] = 0;
        } else if (isNaN(n)) errs[f.key] = 'Use apenas números, por exemplo 12,5.';
        else out[f.key] = n;
      } else if (f.type === 'date') {
        const iso = brToIso(String(raw ?? ''));
        if (!iso) errs[f.key] = 'Use o formato dia/mês/ano, por exemplo 10/11/2026.';
        else out[f.key] = iso;
      } else if (f.required) {
        const empty = raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0);
        if (empty) errs[f.key] = f.type === 'select' ? 'Escolha uma opção.' : 'Preencha este campo.';
      }
    });
    setErrors(errs);
    if (Object.keys(errs).length === 0) onSubmit(out);
  };

  return (
    <Modal visible={visible} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.backdrop, !wide && { justifyContent: 'flex-end', padding: 0 }]}>
        <View style={[s.sheet, wide ? { width: 560, maxHeight: '88%' } : { width: '100%', maxHeight: '92%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
          <View style={s.sheetHead}>
            <T v="h2" style={{ fontSize: 18 }}>{title}</T>
            <IconBtn label="Fechar" onPress={onClose}><X size={20} color={c.muted} /></IconBtn>
          </View>
          <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 6 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
              {shown.map((f) => (
                <View key={f.key} style={{ width: f.half ? '50%' : '100%', paddingHorizontal: 6, marginBottom: 14 }}>
                  <T v="label" style={{ marginBottom: 6, color: c.ink }}>{f.label}</T>
                  {f.type === 'text' || f.type === 'number' || f.type === 'multiline' || f.type === 'date' ? (
                    <TextInput
                      value={String(values[f.key] ?? '')}
                      onChangeText={(t) => set(f.key, t)}
                      placeholder={f.placeholder}
                      placeholderTextColor={c.faint}
                      keyboardType={f.type === 'number' ? 'decimal-pad' : f.type === 'date' ? 'numbers-and-punctuation' : 'default'}
                      multiline={f.type === 'multiline'}
                      style={[s.input, { fontFamily: font, fontSize: 14.5, color: c.ink }, f.type === 'multiline' && { minHeight: 76, textAlignVertical: 'top' }, errors[f.key] ? { borderColor: c.danger } : null]}
                    />
                  ) : null}
                  {f.type === 'photo' ? <PhotoInput value={values[f.key]} onChange={(v) => set(f.key, v)} /> : null}
                  {f.type === 'video' ? <VideoInput value={values[f.key]} onChange={(v) => set(f.key, v)} /> : null}
                  {f.type === 'select' ? <Select value={values[f.key] ?? ''} options={f.options ?? []} onChange={(v) => set(f.key, v)} placeholder={f.placeholder} /> : null}
                  {f.type === 'choice' ? <Segmented value={values[f.key] ?? ''} options={f.options ?? []} onChange={(v) => set(f.key, v)} /> : null}
                  {f.type === 'month' ? <MonthPicker value={values[f.key]} onChange={(v) => set(f.key, v)} /> : null}
                  {f.type === 'months' ? <MonthPicker multi value={values[f.key] ?? []} onChange={(v) => set(f.key, v)} /> : null}
                  {f.type === 'toggle' ? (
                    <Segmented value={values[f.key] ? 'sim' : 'nao'} options={[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]} onChange={(v) => set(f.key, v === 'sim')} />
                  ) : null}
                  {errors[f.key] ? <T v="small" style={{ color: c.danger, marginTop: 4 }}>{errors[f.key]}</T> : f.hint ? <T v="small" style={{ marginTop: 4 }}>{f.hint}</T> : null}
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={s.sheetFoot}>
            <Btn label="Cancelar" kind="ghost" onPress={onClose} />
            <Btn label={submitLabel} onPress={submit} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ---------- Confirmação ---------- */

interface ConfirmOpts {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}
const ConfirmCtx = createContext<(o: ConfirmOpts) => void>(() => {});
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const ask = useCallback((o: ConfirmOpts) => setOpts(o), []);
  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      <Modal visible={!!opts} transparent animationType="fade" onRequestClose={() => setOpts(null)}>
        <View style={s.backdrop}>
          <View style={[s.sheet, { width: '100%', maxWidth: 400, padding: 20, gap: 8 }]}>
            <T v="h2" style={{ fontSize: 18 }}>{opts?.title}</T>
            <T style={{ color: c.muted }}>{opts?.message}</T>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <Btn label="Cancelar" kind="ghost" onPress={() => setOpts(null)} />
              <Btn
                label={opts?.confirmLabel ?? 'Confirmar'}
                kind={opts?.danger === false ? 'primary' : 'danger'}
                onPress={() => {
                  opts?.onConfirm();
                  setOpts(null);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 16, paddingBottom: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 10, paddingHorizontal: 15, borderRadius: radius.md },
  iconBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmented: { flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 3, borderWidth: 1, borderColor: c.line, alignSelf: 'flex-start', flexWrap: 'wrap' },
  segment: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 7, borderWidth: 1, borderColor: 'transparent' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: 1, borderTopColor: c.line },
  chip: { minWidth: 50, alignItems: 'center', paddingVertical: 7, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
  input: { borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: c.surface, minHeight: 42 },
  dropdown: { maxHeight: 210, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, marginTop: 4, backgroundColor: c.surface },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11 },
  backdrop: { flex: 1, backgroundColor: 'rgba(12,28,19,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 18, paddingRight: 10, paddingTop: 14, paddingBottom: 8 },
  sheetFoot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 14, borderTopWidth: 1, borderTopColor: c.line },
});
