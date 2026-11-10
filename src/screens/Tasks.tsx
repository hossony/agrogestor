import { Check } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useStore } from '../store';
import { c } from '../theme';
import { Task } from '../types';
import { AddBtn, Badge, Card, Empty, FieldDef, FormSheet, IconBtn, Screen, Segmented, T, useConfirm, useWide } from '../ui';
import { isoToBr, periodIndex, periodLabel, todayIso } from '../utils';
import { fieldById, fieldOptions, Nav, periodFields, recordFields, WORK_TYPES } from './common';
import { Pencil, Trash2 } from 'lucide-react-native';

const TYPES = WORK_TYPES;

export default function Tasks({ intent }: Nav) {
  const { data, now, save, remove } = useStore();
  const confirm = useConfirm();
  const wide = useWide();
  const st = data.settings;
  const nowIdx = periodIndex(now.year, now.month);
  const [filter, setFilter] = useState<'abertas' | 'feitas'>('abertas');
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [finishing, setFinishing] = useState<Task | null>(null);

  const form: FieldDef[] = [
    { key: 'title', label: 'O que precisa ser feito', type: 'text', required: true, placeholder: 'Ex.: Aplicar calcário' },
    { key: 'type', label: 'Tipo', type: 'select', required: true, half: true, options: TYPES.map((x) => ({ value: x, label: x })) },
    { key: 'fieldId', label: 'Talhão (opcional)', type: 'select', half: true, options: [{ value: '', label: 'Nenhum' }, ...fieldOptions(data)] },
    ...periodFields('Mês previsto'),
  ];
  const blank = { title: '', type: '', fieldId: '', month: now.month, year: now.year, done: false };

  useEffect(() => {
    if (intent === 'novo') setEditing(blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = data.tasks
    .filter((t) => (filter === 'abertas' ? !t.done : t.done))
    .sort((a, b) => periodIndex(a.year, a.month) - periodIndex(b.year, b.month));
  const open = data.tasks.filter((t) => !t.done).length;

  return (
    <Screen title="Tarefas" subtitle={`${open} ${open === 1 ? 'tarefa aberta' : 'tarefas abertas'}`} action={<AddBtn label="Nova tarefa" onPress={() => setEditing(blank)} />}>
      <Segmented value={filter} onChange={setFilter} options={[{ value: 'abertas', label: 'Abertas' }, { value: 'feitas', label: 'Concluídas' }]} />
      <Card pad={0}>
        {rows.length === 0 ? (
          <Empty title={filter === 'abertas' ? 'Nenhuma tarefa aberta' : 'Nenhuma tarefa concluída'} hint="Planeje o trabalho de cada mês. Ao concluir, a tarefa vai para o diário com data e imagem." action={filter === 'abertas' ? <AddBtn label="Nova tarefa" onPress={() => setEditing(blank)} /> : undefined} />
        ) : null}
        {rows.map((t: Task, i) => {
          const diff = periodIndex(t.year, t.month) - nowIdx;
          const due = <Badge tone={diff < 0 ? 'red' : diff === 0 ? 'yellow' : 'neutral'} label={diff < 0 ? 'Atrasada' : diff === 0 ? 'Este mês' : diff === 1 ? 'Mês que vem' : `Em ${diff} meses`} />;
          return (
            <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: t.done }}
                accessibilityLabel={t.done ? 'Reabrir tarefa' : 'Concluir tarefa'}
                onPress={() => (t.done ? save('tasks', { id: t.id, done: false }) : setFinishing(t))}
                hitSlop={8}
                style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: t.done ? c.primary : c.faint, backgroundColor: t.done ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}
              >
                {t.done ? <Check size={15} color="#fff" strokeWidth={3} /> : null}
              </Pressable>
              <View style={{ flex: 1 }}>
                <T style={[{ fontWeight: '600' }, t.done && { textDecorationLine: 'line-through', color: c.muted }]}>{t.title}</T>
                <T v="small">{[t.type, fieldById(data, t.fieldId)?.name, periodLabel(t.year, t.month, st)].filter(Boolean).join(', ')}</T>
                {!t.done && !wide ? <View style={{ marginTop: 5 }}>{due}</View> : null}
              </View>
              {!t.done && wide ? due : null}
              <View style={{ flexDirection: 'row' }}>
                <IconBtn label="Editar" onPress={() => setEditing({ ...t, fieldId: t.fieldId ?? '' })}><Pencil size={16} color={c.muted} /></IconBtn>
                <IconBtn label="Excluir" onPress={() => confirm({ title: 'Excluir esta tarefa?', message: t.title, confirmLabel: 'Excluir tarefa', onConfirm: () => remove('tasks', t.id) })}><Trash2 size={16} color={c.danger} /></IconBtn>
              </View>
            </View>
          );
        })}
      </Card>
      <FormSheet
        visible={!!editing}
        title={editing?.id ? 'Editar tarefa' : 'Nova tarefa'}
        fields={form}
        initial={editing ?? blank}
        submitLabel="Salvar tarefa"
        onClose={() => setEditing(null)}
        onSubmit={(v) => {
          save('tasks', { ...v, fieldId: v.fieldId || undefined });
          setEditing(null);
        }}
      />
      <FormSheet
        visible={!!finishing}
        title="Concluir tarefa"
        fields={recordFields(data)}
        initial={{ title: finishing?.title ?? '', type: finishing?.type ?? '', fieldId: finishing?.fieldId ?? '', date: isoToBr(todayIso()), photo: undefined, notes: '' }}
        submitLabel="Concluir e registrar"
        onClose={() => setFinishing(null)}
        onSubmit={(v) => {
          if (finishing) {
            save('tasks', { id: finishing.id, done: true });
            save('records', { ...v, fieldId: v.fieldId || undefined, taskId: finishing.id, year: now.year, month: now.month });
          }
          setFinishing(null);
        }}
      />
    </Screen>
  );
}
