import { Plus, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { MapId, MAPS, mapById } from '../data/maps';
import { Appear, celebrate } from '../motion';
import { useStore } from '../store';
import { c, font, radius } from '../theme';
import { Btn, IconBtn, Segmented, T, useWide } from '../ui';
import { num, parseNum } from '../utils';

interface Row {
  key: string;
  no: string;
  area: string;
  rice: boolean;
  note?: string;
}

const rowsFor = (id: MapId): Row[] => {
  const m = mapById(id);
  const lots = m?.startLots ?? [];
  if (!lots.length) return [{ key: 'r0', no: '', area: '', rice: false }];
  return lots.map((l, i) => ({ key: `r${i}`, no: String(l.no), area: l.areaHa ? num(l.areaHa, 2) : '', rice: !!l.rice, note: l.note }));
};

/**
 * Cadastro rápido dos talhões com o número do campo no mapa do jogo.
 * Os lotes iniciais conhecidos já vêm preenchidos; a área vem do menu de
 * Terras do jogo e pode ser ajustada.
 */
export function MapFieldsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { data, save, setSettings } = useStore();
  const wide = useWide();
  const initial = (mapById(data.settings.map)?.id ?? 'riverbend') as MapId;
  const [mapId, setMapId] = useState<MapId>(initial);
  const [rows, setRows] = useState<Row[]>(rowsFor(initial));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setMapId(initial);
    setRows(rowsFor(initial));
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const map = mapById(mapId)!;
  const existing = new Set(data.fields.filter((f) => f.mapNo !== undefined).map((f) => f.mapNo));
  const set = (key: string, patch: Partial<Row>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = () => setRows((list) => [...list, { key: `r${Date.now()}`, no: '', area: '', rice: false }]);

  const submit = () => {
    const filled = rows.filter((r) => r.no.trim() || r.area.trim());
    if (!filled.length) return setError('Preencha ao menos um campo com número e área.');
    for (const r of filled) {
      const no = parseInt(r.no, 10);
      const area = parseNum(r.area);
      if (!no || no < 1) return setError('Cada linha precisa do número do campo (como aparece no mapa do jogo).');
      if (!area || area <= 0) return setError(`Informe a área do campo ${no} em hectares. Ela aparece no menu de Terras do jogo.`);
      if (existing.has(no)) return setError(`O campo ${no} já está cadastrado.`);
    }
    filled.forEach((r) => {
      const no = parseInt(r.no, 10);
      save('fields', {
        name: `Campo ${no}`,
        mapNo: no,
        areaHa: parseNum(r.area),
        ownership: 'proprio',
        plowed: true,
        limed: false,
        fertLevel: 0,
        weeds: false,
        stones: false,
        rice: r.rice,
        flooded: false,
        notes: r.note ? `${map.name}: ${r.note}` : map.name,
      });
    });
    setSettings({ map: mapId });
    celebrate();
    onClose();
  };

  const input = { borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 9, fontFamily: font, fontSize: 14.5, color: c.ink, backgroundColor: c.surface } as const;

  return (
    <Modal visible={visible} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(12,28,19,0.55)', alignItems: 'center', justifyContent: wide ? 'center' : 'flex-end', padding: wide ? 16 : 0 }}>
        <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden', width: wide ? 600 : '100%', maxHeight: wide ? '88%' : '92%', borderBottomLeftRadius: wide ? radius.lg : 0, borderBottomRightRadius: wide ? radius.lg : 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 18, paddingRight: 10, paddingTop: 14, paddingBottom: 8 }}>
            <T v="h2" style={{ fontSize: 18 }}>Talhões do mapa do jogo</T>
            <IconBtn label="Fechar" onPress={onClose}><X size={20} color={c.muted} /></IconBtn>
          </View>
          <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 12 }} keyboardShouldPersistTaps="handled">
            <Segmented
              value={mapId}
              onChange={(v) => {
                setMapId(v);
                setRows(rowsFor(v));
                setError('');
              }}
              options={MAPS.map((m) => ({ value: m.id, label: m.name }))}
            />
            <T v="small">
              {map.startLots.length
                ? `Os lotes iniciais de ${map.name} já vêm preenchidos. Confira a área no menu de Terras do jogo e acrescente os campos que você comprar.`
                : `Digite o número de cada campo como aparece no mapa de ${map.name} e a área em hectares do menu de Terras.`}
            </T>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 2 }}>
              <T v="label" style={{ width: 70 }}>Nº campo</T>
              <T v="label" style={{ width: 90 }}>Área (ha)</T>
              <T v="label" style={{ flex: 1 }}>Arrozal</T>
            </View>
            {rows.map((r, i) => (
              <Appear key={r.key} index={i}>
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput accessibilityLabel="Número do campo" value={r.no} onChangeText={(t) => set(r.key, { no: t.replace(/\D/g, '') })} keyboardType="number-pad" placeholder="12" placeholderTextColor={c.faint} style={[input, { width: 70 }]} />
                    <TextInput accessibilityLabel="Área em hectares" value={r.area} onChangeText={(t) => set(r.key, { area: t })} keyboardType="decimal-pad" placeholder="4,5" placeholderTextColor={c.faint} style={[input, { width: 90 }]} />
                    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: r.rice }} onPress={() => set(r.key, { rice: !r.rice })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: r.rice ? c.primary : c.faint, backgroundColor: r.rice ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        {r.rice ? <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>✓</Text> : null}
                      </View>
                      <T v="small">{r.rice ? 'Sim' : 'Não'}</T>
                    </Pressable>
                    <IconBtn label="Remover linha" onPress={() => setRows((list) => (list.length > 1 ? list.filter((x) => x.key !== r.key) : [{ key: 'r0', no: '', area: '', rice: false }]))}>
                      <Trash2 size={16} color={c.danger} />
                    </IconBtn>
                  </View>
                  {r.note ? <T v="small" style={{ color: c.harvestInk }}>{r.note}</T> : null}
                  {r.no && existing.has(parseInt(r.no, 10)) ? <T v="small" style={{ color: c.danger }}>Já cadastrado</T> : null}
                </View>
              </Appear>
            ))}
            <View style={{ alignItems: 'flex-start' }}>
              <Btn small kind="ghost" label="Adicionar campo" icon={<Plus size={14} color={c.ink} />} onPress={add} />
            </View>
            {error ? <T style={{ color: c.danger }}>{error}</T> : null}
          </ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 14, borderTopWidth: 1, borderTopColor: c.line }}>
            <Btn label="Cancelar" kind="ghost" onPress={onClose} />
            <Btn label="Cadastrar talhões" onPress={submit} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
