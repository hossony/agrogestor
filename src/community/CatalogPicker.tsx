import AsyncStorage from '@react-native-async-storage/async-storage';
import { Search, Tractor, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Appear, Pressy } from '../motion';
import { c, font } from '../theme';
import { Badge, T } from '../ui';
import { defaultApiUrl, mediaUrl, request } from './api';
import { CATALOG_CATEGORIES, hpLabel, type CatalogMachine } from './catalog';

const CACHE = 'agrogestor:catalogo-fs25';

/** Catálogo do FS25 vindo do site (com cópia local para funcionar sem internet). */
export function useCatalog(open: boolean) {
  const [list, setList] = useState<CatalogMachine[] | null>(null);
  const [error, setError] = useState('');
  const base = defaultApiUrl();
  useEffect(() => {
    if (!open) return;
    let alive = true;
    AsyncStorage.getItem(CACHE)
      .then((raw) => {
        if (alive && raw) setList(JSON.parse(raw));
      })
      .catch(() => {});
    if (!base) {
      setError('Endereço do site não configurado.');
      return;
    }
    request<CatalogMachine[]>({ url: base }, '/api/catalog')
      .then((rows) => {
        if (!alive) return;
        setList(rows);
        setError('');
        AsyncStorage.setItem(CACHE, JSON.stringify(rows)).catch(() => {});
      })
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [open, base]);
  return { list, error, base };
}

/** Categoria do catálogo → categoria da Frota do app. */
export function fleetCategory(cat: string): string {
  if (cat === 'Trator' || cat === 'Colheitadeira' || cat === 'Caminhão') return cat;
  if (cat === 'Reboque') return 'Carreta';
  if (cat === 'Carregadeira') return 'Veículo';
  return 'Implemento';
}

/** Lista para escolher uma máquina do FS25 e já preencher o cadastro da Frota. */
export function CatalogPicker({ visible, onClose, onPick, currency }: { visible: boolean; onClose: () => void; onPick: (m: CatalogMachine, imageUrl: string | null) => void; currency: string }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { list, error, base } = useCatalog(visible);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const cols = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const rows = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return (list ?? []).filter((m) => (!cat || m.category === cat) && (!qn || `${m.brand} ${m.model}`.toLowerCase().includes(qn)));
  }, [list, q, cat]);
  const cats = CATALOG_CATEGORIES.filter((x) => list?.some((m) => m.category === x));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(12,28,19,0.55)' }}>
        <View style={{ flex: 1, marginTop: insets.top + 30, backgroundColor: c.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' }}>
          <View style={{ padding: 16, paddingBottom: 10, gap: 10, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <T v="h2" style={{ fontSize: 18 }}>
                  Catálogo do FS25
                </T>
                <T v="small">Escolha a máquina: preço, potência e imagem já vêm preenchidos.</T>
              </View>
              <Pressable accessibilityLabel="Fechar" onPress={onClose} hitSlop={10} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} color={c.ink} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingHorizontal: 12, backgroundColor: c.surface }}>
              <Search size={17} color={c.faint} />
              <TextInput value={q} onChangeText={setQ} placeholder="Buscar marca ou modelo" placeholderTextColor={c.faint} style={{ flex: 1, fontFamily: font, fontSize: 15, color: c.ink, paddingVertical: 10 }} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {['', ...cats].map((x) => {
                const on = cat === x;
                return (
                  <Pressy key={x || 'todas'} onPress={() => setCat(x)} scaleTo={0.94} style={{ paddingVertical: 7, paddingHorizontal: 13, borderRadius: 99, borderWidth: 1, borderColor: on ? c.primary : c.line, backgroundColor: on ? c.primary : c.surface }}>
                    <Text style={{ fontFamily: font, fontSize: 13, fontWeight: '700', color: on ? '#fff' : c.muted }}>{x || 'Todas'}</Text>
                  </Pressy>
                );
              })}
            </ScrollView>
          </View>
          {!list && !error ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator color={c.primary} />
            </View>
          ) : null}
          {error && !list ? <T style={{ padding: 20, color: c.danger }}>Não foi possível carregar o catálogo: {error}</T> : null}
          <FlatList
            key={cols}
            data={rows}
            numColumns={cols}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 10, paddingBottom: insets.bottom + 20 }}
            ListEmptyComponent={list ? <T v="small" style={{ padding: 20, textAlign: 'center' }}>Nenhuma máquina encontrada.</T> : undefined}
            renderItem={({ item: m, index }) => {
              const img = mediaUrl({ url: base }, m.image_url);
              return (
                <View style={{ width: `${100 / cols}%`, padding: 6 }}>
                  <Appear index={index % 12}>
                    <Pressy accessibilityRole="button" accessibilityLabel={`${m.brand} ${m.model}`} onPress={() => onPick(m, img)} scaleTo={0.96} style={{ backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
                      <View style={{ aspectRatio: 4 / 3, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                        {img ? <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Tractor size={34} color={c.primaryDark} />}
                      </View>
                      <View style={{ padding: 10, gap: 2 }}>
                        <Text style={{ fontFamily: font, fontSize: 11.5, fontWeight: '700', color: c.muted }} numberOfLines={1}>
                          {m.brand}
                        </Text>
                        <Text style={{ fontFamily: font, fontSize: 14, fontWeight: '800', color: c.ink }} numberOfLines={1}>
                          {m.model}
                        </Text>
                        <T v="small" numberOfLines={1}>
                          {[m.category, hpLabel(m)].filter(Boolean).join(' · ')}
                        </T>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 4 }}>
                          <Text style={{ fontFamily: font, fontWeight: '800', color: c.ink, fontSize: 13 }} numberOfLines={1}>
                            {m.price ? `${currency} ${m.price.toLocaleString('pt-BR')}` : '—'}
                          </Text>
                          {!m.verified ? <Badge label="conferir" tone="yellow" /> : null}
                        </View>
                      </View>
                    </Pressy>
                  </Appear>
                </View>
              );
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
