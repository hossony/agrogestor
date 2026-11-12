import { Camera, Film, Image as ImageIcon } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { RECORD_TEMPLATES } from '../data/guide';
import { deleteImage } from '../media';
import { Appear, celebrate, Pressy } from '../motion';
import { useStore } from '../store';
import { c, font } from '../theme';
import { LogEntry } from '../types';
import { AddBtn, Badge, Card, DataList, DetailSheet, Empty, FormSheet, Photo, Screen, Segmented, T, useConfirm, useWide } from '../ui';
import { isoToBr, periodLabel, todayIso } from '../utils';
import { VideoBadge, VideoPlayer, VideoTile } from '../video';
import { fieldById, Nav, recordFields, WORK_TYPES } from './common';

type MediaFilter = 'todos' | 'video' | 'foto';

export default function Records({ intent }: Nav) {
  const { data, now, save, remove } = useStore();
  const confirm = useConfirm();
  const wide = useWide();
  const { width } = useWindowDimensions();
  const st = data.settings;
  const [view, setView] = useState<'galeria' | 'lista'>('galeria');
  const [type, setType] = useState('todos');
  const [media, setMedia] = useState<MediaFilter>('todos');
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const blank = { title: '', type: '', fieldId: '', date: isoToBr(todayIso()), photo: undefined, video: undefined, notes: '' };
  const fromTemplate = (label: string) => {
    const t = RECORD_TEMPLATES.find((x) => x.label === label);
    return t ? { ...blank, title: t.title, type: t.type, notes: '' } : blank;
  };
  useEffect(() => {
    // 'novo' abre em branco; 'modelo:Colheita' abre já preenchido.
    if (intent === 'novo') setEditing(blank);
    else if (intent?.startsWith('modelo:')) setEditing(fromTemplate(intent.slice(7)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const all = data.records.slice().sort((a, b) => b.date.localeCompare(a.date));
  const rows = all.filter((r) => (type === 'todos' || r.type === type) && (media === 'todos' || (media === 'video' ? !!r.video : !!r.photo)));
  const used = WORK_TYPES.filter((t) => all.some((r) => r.type === t));
  const open = data.records.find((r) => r.id === openId) ?? null;
  const withPhoto = all.filter((r) => r.photo).length;
  const withVideo = all.filter((r) => r.video).length;

  const cols = wide ? Math.max(3, Math.floor((Math.min(width - 232, 1180) - 56) / 250)) : 2;
  const del = (r: LogEntry) =>
    confirm({
      title: 'Excluir este registro?',
      message: `${r.title}, de ${isoToBr(r.date)}. A imagem e o vídeo anexados também são apagados.`,
      confirmLabel: 'Excluir registro',
      onConfirm: () => {
        deleteImage(r.photo);
        deleteImage(r.video);
        remove('records', r.id);
        setOpenId(null);
      },
    });
  const edit = (r: LogEntry) => {
    setOpenId(null);
    setEditing({ ...r, fieldId: r.fieldId ?? '', date: isoToBr(r.date) });
  };

  const thumb = (r: LogEntry, style: any, small?: boolean) =>
    r.photo ? (
      <View>
        <Photo uri={r.photo} style={style} />
        {r.video ? <View style={{ position: 'absolute', right: 6, bottom: 6 }}><VideoBadge big={!small} /></View> : null}
      </View>
    ) : r.video ? (
      <VideoTile style={style} label={small ? undefined : r.type} />
    ) : (
      <Photo uri={undefined} style={style} fallback={<Camera size={small ? 18 : 26} color={c.primaryDark} />} />
    );

  return (
    <Screen
      title="Diário de campo"
      subtitle={`${all.length} ${all.length === 1 ? 'registro' : 'registros'}, ${withPhoto} com imagem, ${withVideo} com vídeo`}
      action={<AddBtn label="Novo registro" onPress={() => setEditing(blank)} />}
    >
      <Card pad={14} style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Film size={18} color={c.primaryDark} />
          <T style={{ fontWeight: '700', flex: 1 }}>Registrar com vídeo</T>
          <T v="small">{wide ? 'Escolha o trabalho e anexe o vídeo' : 'Toque no trabalho'}</T>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {RECORD_TEMPLATES.map((t, i) => (
            <Appear key={t.label} index={i} axis="x">
              <Pressy accessibilityRole="button" accessibilityLabel={`Novo registro de ${t.label}`} onPress={() => setEditing(fromTemplate(t.label))} style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20, backgroundColor: c.primarySoft, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Film size={14} color={c.primaryDark} />
                <Text style={{ fontFamily: font, fontSize: 13.5, fontWeight: '600', color: c.primaryDark }}>{t.label}</Text>
              </Pressy>
            </Appear>
          ))}
        </ScrollView>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Segmented value={view} onChange={setView} options={[{ value: 'galeria', label: 'Galeria' }, { value: 'lista', label: 'Lista' }]} />
          <Segmented value={media} onChange={setMedia} options={[{ value: 'todos', label: 'Tudo' }, { value: 'video', label: `Vídeos (${withVideo})` }, { value: 'foto', label: 'Fotos' }]} />
        </View>
        {used.length > 1 ? <Segmented value={type} onChange={setType} options={[{ value: 'todos', label: 'Todos' }, ...used.map((t) => ({ value: t, label: t }))]} /> : null}
      </View>

      {rows.length === 0 ? (
        <Card>
          <Empty
            title={media === 'video' ? 'Nenhum vídeo ainda' : 'Nenhum registro ainda'}
            hint="Guarde aqui o que você fez na fazenda: um vídeo colhendo o trigo, a semeadora plantando, um talhão recém-arado. Anexe foto ou vídeo e a data fica registrada."
            action={<AddBtn label="Novo registro" onPress={() => setEditing(media === 'video' ? fromTemplate('Colheita') : blank)} />}
          />
        </Card>
      ) : view === 'galeria' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
          {rows.map((r, i) => (
            <Appear key={r.id} index={i} style={{ width: `${100 / cols}%`, padding: 5 }}>
              <Pressy accessibilityRole="button" accessibilityLabel={`Abrir ${r.title}`} onPress={() => setOpenId(r.id)} scaleTo={0.97}>
                <Card pad={0} style={{ overflow: 'hidden' }}>
                  {thumb(r, { width: '100%', aspectRatio: 4 / 3 })}
                  <View style={{ padding: 10 }}>
                    <T style={{ fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{r.title}</T>
                    <T v="small" numberOfLines={1}>{isoToBr(r.date)}{fieldById(data, r.fieldId) ? `, ${fieldById(data, r.fieldId)!.name}` : ''}</T>
                  </View>
                </Card>
              </Pressy>
            </Appear>
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
                <Pressy onPress={() => setOpenId(r.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 8, overflow: 'hidden' }}>{thumb(r, { width: 46, height: 46 }, true)}</View>
                  <T style={{ fontWeight: '600', flexShrink: 1 }}>{r.title}</T>
                </Pressy>
              ),
            },
            { label: 'Feito em', render: (r) => isoToBr(r.date) },
            { label: 'No jogo', render: (r) => periodLabel(r.year, r.month, st) },
            { label: 'Tipo', render: (r) => <Badge label={r.type} /> },
            {
              label: 'Mídia',
              render: (r) => (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {r.photo ? <ImageIcon size={16} color={c.primaryDark} /> : null}
                  {r.video ? <Film size={16} color={c.primaryDark} /> : null}
                  {!r.photo && !r.video ? <T v="small">—</T> : null}
                </View>
              ),
            },
            { label: 'Talhão', flex: 1.4, render: (r) => fieldById(data, r.fieldId)?.name ?? '—' },
          ]}
        />
      )}

      <DetailSheet
        visible={!!open}
        title={open?.title ?? ''}
        subtitle={open?.type}
        media={open?.video ? <VideoPlayer uri={open.video} style={{ width: '100%' }} autoPlay /> : undefined}
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
        title={editing?.id ? 'Editar registro' : editing?.type ? `Registro de ${String(editing.type).toLowerCase()}` : 'Novo registro'}
        fields={recordFields(data)}
        initial={editing ?? blank}
        submitLabel="Salvar registro"
        onClose={() => setEditing(null)}
        onSubmit={(v) => {
          const before = data.records.find((r) => r.id === v.id);
          if (before?.photo && before.photo !== v.photo) deleteImage(before.photo);
          if (before?.video && before.video !== v.video) deleteImage(before.video);
          save('records', { ...v, fieldId: v.fieldId || undefined, year: v.year ?? now.year, month: v.month ?? now.month });
          setEditing(null);
          if (!before) celebrate();
        }}
      />
    </Screen>
  );
}
