import { Camera } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { deleteImage } from '../media';
import { useStore } from '../store';
import { c } from '../theme';
import { LogEntry } from '../types';
import { AddBtn, Badge, Card, DataList, DetailSheet, Empty, FormSheet, Photo, Screen, Segmented, T, useConfirm, useWide } from '../ui';
import { isoToBr, periodLabel, todayIso } from '../utils';
import { fieldById, Nav, recordFields, WORK_TYPES } from './common';

export default function Records({ intent }: Nav) {
  const { data, now, save, remove } = useStore();
  const confirm = useConfirm();
  const wide = useWide();
  const { width } = useWindowDimensions();
  const st = data.settings;
  const [view, setView] = useState<'galeria' | 'lista'>('galeria');
  const [type, setType] = useState('todos');
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const blank = { title: '', type: '', fieldId: '', date: isoToBr(todayIso()), photo: undefined, notes: '' };
  useEffect(() => {
    if (intent === 'novo') setEditing(blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const all = data.records.slice().sort((a, b) => b.date.localeCompare(a.date));
  const rows = all.filter((r) => type === 'todos' || r.type === type);
  const used = WORK_TYPES.filter((t) => all.some((r) => r.type === t));
  const open = data.records.find((r) => r.id === openId) ?? null;
  const withPhoto = all.filter((r) => r.photo).length;

  const cols = wide ? Math.max(3, Math.floor((Math.min(width - 232, 1180) - 56) / 250)) : 2;
  const del = (r: LogEntry) =>
    confirm({
      title: 'Excluir este registro?',
      message: `${r.title}, de ${isoToBr(r.date)}. A imagem anexada também é apagada.`,
      confirmLabel: 'Excluir registro',
      onConfirm: () => {
        deleteImage(r.photo);
        remove('records', r.id);
        setOpenId(null);
      },
    });
  const edit = (r: LogEntry) => {
    setOpenId(null);
    setEditing({ ...r, fieldId: r.fieldId ?? '', date: isoToBr(r.date) });
  };

  return (
    <Screen title="Diário de campo" subtitle={`${all.length} ${all.length === 1 ? 'registro' : 'registros'}, ${withPhoto} com imagem`} action={<AddBtn label="Novo registro" onPress={() => setEditing(blank)} />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
        <Segmented value={view} onChange={setView} options={[{ value: 'galeria', label: 'Galeria' }, { value: 'lista', label: 'Lista' }]} />
        {used.length > 1 ? <Segmented value={type} onChange={setType} options={[{ value: 'todos', label: 'Todos' }, ...used.map((t) => ({ value: t, label: t }))]} /> : null}
      </View>

      {rows.length === 0 ? (
        <Card><Empty title="Nenhum registro ainda" hint="Guarde aqui o que você fez na fazenda: a colheita do trigo, a compra de um trator, um talhão recém-plantado. Anexe uma captura de tela ou foto e a data fica registrada." action={<AddBtn label="Novo registro" onPress={() => setEditing(blank)} />} /></Card>
      ) : view === 'galeria' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
          {rows.map((r) => (
            <View key={r.id} style={{ width: `${100 / cols}%`, padding: 5 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${r.title}`} onPress={() => setOpenId(r.id)} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
                <Card pad={0} style={{ overflow: 'hidden' }}>
                  <Photo uri={r.photo} style={{ width: '100%', aspectRatio: 4 / 3 }} fallback={<Camera size={26} color={c.primaryDark} />} />
                  <View style={{ padding: 10 }}>
                    <T style={{ fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{r.title}</T>
                    <T v="small" numberOfLines={1}>{isoToBr(r.date)}{fieldById(data, r.fieldId) ? `, ${fieldById(data, r.fieldId)!.name}` : ''}</T>
                  </View>
                </Card>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <DataList
          rows={rows}
          onEdit={edit}
          onDelete={del}
          columns={[
            {
              label: 'Registro',
              flex: 2.4,
              render: (r) => (
                <Pressable onPress={() => setOpenId(r.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Photo uri={r.photo} style={{ width: 46, height: 46, borderRadius: 8 }} fallback={<Camera size={18} color={c.primaryDark} />} />
                  <T style={{ fontWeight: '600', flexShrink: 1 }}>{r.title}</T>
                </Pressable>
              ),
            },
            { label: 'Feito em', render: (r) => isoToBr(r.date) },
            { label: 'No jogo', render: (r) => periodLabel(r.year, r.month, st) },
            { label: 'Tipo', render: (r) => <Badge label={r.type} /> },
            { label: 'Talhão', flex: 1.4, render: (r) => fieldById(data, r.fieldId)?.name ?? '—' },
          ]}
        />
      )}

      <DetailSheet
        visible={!!open}
        title={open?.title ?? ''}
        subtitle={open?.type}
        photo={open?.photo}
        rows={[
          ['Feito em', open ? isoToBr(open.date) : ''],
          ['No jogo', open ? periodLabel(open.year, open.month, st) : ''],
          ['Talhão', fieldById(data, open?.fieldId)?.name],
          ['Anotações', open?.notes],
        ]}
        onEdit={() => open && edit(open)}
        onDelete={() => open && del(open)}
        onClose={() => setOpenId(null)}
      />
      <FormSheet
        visible={!!editing}
        title={editing?.id ? 'Editar registro' : 'Novo registro'}
        fields={recordFields(data)}
        initial={editing ?? blank}
        submitLabel="Salvar registro"
        onClose={() => setEditing(null)}
        onSubmit={(v) => {
          const before = data.records.find((r) => r.id === v.id);
          if (before?.photo && before.photo !== v.photo) deleteImage(before.photo);
          save('records', { ...v, fieldId: v.fieldId || undefined, year: v.year ?? now.year, month: v.month ?? now.month });
          setEditing(null);
        }}
      />
    </Screen>
  );
}
