import * as Clipboard from 'expo-clipboard';
import { Copy, Upload } from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';
import { demoData, emptyData } from '../data/demo';
import { enableSystemNotifications } from '../notify';
import { useStore } from '../store';
import { c } from '../theme';
import { Data } from '../types';
import { Btn, FieldDef, FormSheet, Screen, Section, Segmented, T, useConfirm } from '../ui';
import { MONTHS_FULL, num } from '../utils';

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: c.line, gap: 12 }}>
      <T style={{ color: c.muted }}>{label}</T>
      <T style={{ fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{value}</T>
    </View>
  );
}

export default function Settings() {
  const { data, setSettings, replaceAll, logout } = useStore();
  const confirm = useConfirm();
  const st = data.settings;
  const [sheet, setSheet] = useState<'farm' | 'period' | 'restore' | null>(null);
  const [message, setMessage] = useState('');

  const farmForm: FieldDef[] = [
    { key: 'farmName', label: 'Nome da fazenda', type: 'text', required: true },
    { key: 'currency', label: 'Moeda', type: 'text', required: true, half: true, placeholder: '$, €, R$' },
    { key: 'qtyUnit', label: 'Unidade de produção', type: 'text', required: true, half: true, placeholder: 'L' },
    { key: 'pricePer', label: 'Preço informado a cada quantas unidades', type: 'number', required: true, hint: 'No Farming Simulator 25 o preço mostrado é por 1000 L.' },
  ];
  const periodForm: FieldDef[] = [
    { key: 'gameMonth', label: 'Mês atual do jogo', type: 'month', required: true },
    { key: 'gameYear', label: 'Ano do jogo', type: 'number', required: true, half: true },
  ];
  const restoreForm: FieldDef[] = [{ key: 'json', label: 'Cole aqui o backup copiado', type: 'multiline', required: true }];

  const copyBackup = async () => {
    try {
      await Clipboard.setStringAsync(JSON.stringify(data));
      setMessage('Backup copiado. Cole em um arquivo de texto ou mande para você mesmo para guardar.');
    } catch {
      setMessage('Não foi possível copiar neste dispositivo.');
    }
  };

  return (
    <Screen title="Ajustes" subtitle="Fazenda, mês do jogo, notificações e backup">
      <Section title="Fazenda" right={<Btn small kind="ghost" label="Editar" onPress={() => setSheet('farm')} />}>
        <Line label="Nome" value={st.farmName} />
        <Line label="Moeda" value={st.currency} />
        <Line label="Unidade de produção" value={st.qtyUnit} />
        <Line label="Preço informado" value={st.pricePer > 1 ? `a cada ${num(st.pricePer)} ${st.qtyUnit}` : `por ${st.qtyUnit}`} />
      </Section>

      <Section title="Mês do jogo" right={<Btn small kind="ghost" label="Acertar" onPress={() => setSheet('period')} />}>
        <T>O jogo está em {MONTHS_FULL[st.gameMonth - 1].toLowerCase()} do ano {st.gameYear}. Para seguir o jogo, avance o mês no painel sempre que ele virar.</T>
      </Section>

      <Section title="Notificações">
        <T v="small">Com a opção ligada, cada aviso novo (colheita pronta, melhor mês de venda, revisão) também aparece na barra de notificações do aparelho.</T>
        <View style={{ marginTop: 12 }}>
          <Segmented
            value={st.systemNotifications ? 'on' : 'off'}
            options={[{ value: 'on', label: 'Ligadas' }, { value: 'off', label: 'Desligadas' }]}
            onChange={async (v) => {
              if (v === 'off') return setSettings({ systemNotifications: false });
              const ok = await enableSystemNotifications();
              setSettings({ systemNotifications: ok });
              setMessage(ok ? '' : 'O aparelho não liberou as notificações. Libere nas configurações do sistema e tente de novo.');
            }}
          />
        </View>
      </Section>

      <Section title="Tutorial e guia">
        <T v="small" style={{ marginBottom: 10 }}>{data.guideRead.length} tópicos do guia marcados como aprendidos.</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Btn small label="Ver tutorial de novo" onPress={() => setSettings({ tutorialSeen: false })} />
          {data.guideRead.length ? <Btn small kind="ghost" label="Zerar progresso do guia" onPress={() => confirm({ title: 'Zerar o progresso do guia?', message: 'Os tópicos voltam a aparecer como não aprendidos.', confirmLabel: 'Zerar', onConfirm: () => replaceAll({ ...data, guideRead: [] }) })} /> : null}
        </View>
      </Section>

      <Section title="Backup">
        <T v="small">Os dados ficam guardados só neste dispositivo. Para levar do celular para o computador, copie o backup aqui e restaure lá. As imagens e os vídeos não entram no backup.</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <Btn small label="Copiar backup" icon={<Copy size={14} color="#fff" />} onPress={copyBackup} />
          <Btn small kind="ghost" label="Restaurar backup" icon={<Upload size={14} color={c.ink} />} onPress={() => setSheet('restore')} />
        </View>
        {message ? <T v="small" style={{ marginTop: 10, color: c.primaryDark }}>{message}</T> : null}
      </Section>

      <Section title="Acesso">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <T>Conectado como fazenda boaz.</T>
          <Btn small kind="ghost" label="Sair" onPress={logout} />
        </View>
      </Section>

      <Section title="Dados">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Btn small kind="ghost" label="Carregar fazenda de exemplo" onPress={() => confirm({ title: 'Carregar o exemplo?', message: 'Os dados atuais serão substituídos pela fazenda de exemplo.', confirmLabel: 'Carregar exemplo', onConfirm: () => replaceAll(demoData()) })} />
          <Btn small kind="danger" label="Apagar tudo" onPress={() => confirm({ title: 'Apagar todos os dados?', message: 'Talhões, safras, vendas, lançamentos, tarefas e máquinas serão apagados. Faça um backup antes se quiser guardar.', confirmLabel: 'Apagar tudo', onConfirm: () => replaceAll({ ...emptyData(), settings: { ...st, demo: false } }) })} />
        </View>
      </Section>

      <FormSheet visible={sheet === 'farm'} title="Editar fazenda" fields={farmForm} initial={st} submitLabel="Salvar ajustes" onClose={() => setSheet(null)} onSubmit={(v) => { setSettings({ farmName: v.farmName, currency: v.currency, qtyUnit: v.qtyUnit, pricePer: Math.max(1, v.pricePer) }); setSheet(null); }} />
      <FormSheet visible={sheet === 'period'} title="Acertar mês do jogo" fields={periodForm} initial={st} submitLabel="Salvar mês" onClose={() => setSheet(null)} onSubmit={(v) => { setSettings({ gameMonth: v.gameMonth, gameYear: Math.max(1, Math.round(v.gameYear)) }); setSheet(null); }} />
      <FormSheet
        visible={sheet === 'restore'}
        title="Restaurar backup"
        fields={restoreForm}
        initial={{ json: '' }}
        submitLabel="Restaurar backup"
        onClose={() => setSheet(null)}
        onSubmit={(v) => {
          try {
            const parsed = JSON.parse(v.json) as Data;
            if (!parsed.settings || !Array.isArray(parsed.fields)) throw new Error('formato');
            replaceAll({ ...emptyData(), ...parsed });
            setMessage('Backup restaurado.');
          } catch {
            setMessage('Esse texto não é um backup válido. Copie de novo em Ajustes > Copiar backup no outro dispositivo.');
          }
          setSheet(null);
        }}
      />
    </Screen>
  );
}
