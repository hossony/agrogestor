import * as Clipboard from 'expo-clipboard';
import { Cloud, CloudOff, Copy, RefreshCw, Upload } from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';
import { emptyData } from '../data/demo';
import { START_MODES } from '../data/presets';
import { enableSystemNotifications } from '../notify';
import { useStore } from '../store';
import { c } from '../theme';
import { Data } from '../types';
import { Btn, FieldDef, FormSheet, Screen, Section, Segmented, T, useConfirm } from '../ui';
import { MONTHS_FULL, num } from '../utils';
import { MAPS, mapById } from '../data/maps';

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: c.line, gap: 12 }}>
      <T style={{ color: c.muted }}>{label}</T>
      <T style={{ fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{value}</T>
    </View>
  );
}

export default function Settings() {
  const { data, setSettings, replaceAll, logout, user, currentSave, closeSave, changePassword, cloud, syncNow, linkCloud, setServerUrl } = useStore();
  const confirm = useConfirm();
  const st = data.settings;
  const [sheet, setSheet] = useState<'farm' | 'period' | 'restore' | 'password' | 'link' | null>(null);
  const [linkMsg, setLinkMsg] = useState('');
  const [message, setMessage] = useState('');
  const [pwMsg, setPwMsg] = useState('');

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

      <Section title="Mapa do jogo">
        <T v="small" style={{ marginBottom: 10 }}>{mapById(st.map) ? `${mapById(st.map)!.name}, ${mapById(st.map)!.region}. As dicas do Painel e do Guia seguem este mapa.` : 'Escolha o mapa do seu jogo salvo para receber dicas específicas.'}</T>
        <Segmented value={st.map ?? 'outro'} onChange={(v) => setSettings({ map: v })} options={[...MAPS.map((m) => ({ value: m.id, label: m.name })), { value: 'outro', label: st.mapName && !mapById(st.map) ? st.mapName : 'Outro / mod' }]} />
        {st.mode ? <View style={{ marginTop: 10 }}><Line label="Modo de início" value={START_MODES.find((m) => m.id === st.mode)?.name ?? st.mode} /></View> : null}
        {st.startMoney !== undefined ? <Line label="Dinheiro inicial" value={`${st.currency} ${num(st.startMoney)}`} /> : null}
        {st.loan ? <Line label="Empréstimo inicial" value={`${st.currency} ${num(st.loan)}`} /> : null}
      </Section>

      <Section title="Tutorial e guia">
        <T v="small" style={{ marginBottom: 10 }}>{data.guideRead.length} tópicos do guia marcados como aprendidos.</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Btn small label="Ver tutorial de novo" onPress={() => setSettings({ tutorialSeen: false })} />
          {data.guideRead.length ? <Btn small kind="ghost" label="Zerar progresso do guia" onPress={() => confirm({ title: 'Zerar o progresso do guia?', message: 'Os tópicos voltam a aparecer como não aprendidos.', confirmLabel: 'Zerar', onConfirm: () => replaceAll({ ...data, guideRead: [] }) })} /> : null}
        </View>
      </Section>

      <Section title="Sincronização com o site" right={cloud.linked ? <Btn small kind="ghost" label={cloud.state === 'syncing' ? 'Sincronizando…' : 'Sincronizar agora'} icon={<RefreshCw size={14} color={c.ink} />} onPress={() => syncNow()} /> : undefined}>
        {cloud.linked ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {cloud.state === 'offline' || cloud.state === 'error' ? <CloudOff size={18} color={c.danger} /> : <Cloud size={18} color={c.primary} />}
              <T style={{ fontWeight: '600', flexShrink: 1 }}>
                {cloud.state === 'syncing' ? 'Sincronizando…' : cloud.state === 'offline' ? 'Sem conexão' : cloud.state === 'error' ? 'Não sincronizou' : 'Saves iguais no celular, no computador e no site'}
              </T>
            </View>
            {cloud.message ? <T v="small" style={{ marginTop: 6, color: c.danger }}>{cloud.message}</T> : null}
            <Line label="Site" value={cloud.url.replace(/^https?:\/\//, '')} />
            {cloud.code ? <Line label="Seu ID de amigo" value={cloud.code} /> : null}
            {cloud.lastSync ? <Line label="Última sincronização" value={new Date(cloud.lastSync).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} /> : null}
          </>
        ) : (
          <>
            <T v="small">Esta conta está só neste aparelho. Entre com a sua conta do site para os saves ficarem iguais aqui, no computador e na versão web (feed, amigos e fazenda no perfil). Os saves desta conta sobem para a nuvem.</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <Btn small label="Conectar à conta do site" icon={<Cloud size={14} color="#fff" />} onPress={() => setSheet('link')} />
            </View>
            {linkMsg ? <T v="small" style={{ marginTop: 10, color: c.danger }}>{linkMsg}</T> : null}
          </>
        )}
      </Section>

      <Section title="Backup">
        <T v="small">{cloud.linked ? 'Os saves já sincronizam com o site. O backup é uma cópia extra em texto.' : 'Os dados ficam guardados só neste dispositivo. Para levar do celular para o computador, copie o backup aqui e restaure lá.'} As imagens e os vídeos não entram no backup.</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <Btn small label="Copiar backup" icon={<Copy size={14} color="#fff" />} onPress={copyBackup} />
          <Btn small kind="ghost" label="Restaurar backup" icon={<Upload size={14} color={c.ink} />} onPress={() => setSheet('restore')} />
        </View>
        {message ? <T v="small" style={{ marginTop: 10, color: c.primaryDark }}>{message}</T> : null}
      </Section>

      <Section title="Conta">
        <Line label="Nome" value={user?.name ?? ''} />
        <Line label="Usuário" value={`@${user?.username ?? ''}`} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <Btn small kind="ghost" label="Trocar senha" onPress={() => setSheet('password')} />
          <Btn small kind="ghost" label="Trocar de save" onPress={closeSave} />
          <Btn small kind="ghost" label="Sair da conta" onPress={logout} />
        </View>
        {pwMsg ? <T v="small" style={{ marginTop: 10, color: pwMsg === 'Senha trocada.' ? c.primaryDark : c.danger }}>{pwMsg}</T> : null}
      </Section>

      <Section title="Dados deste save">
        <T v="small" style={{ marginBottom: 10 }}>Save "{currentSave?.name}". Apagar limpa só este save; os outros saves e a conta continuam.</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Btn small kind="danger" label="Apagar dados deste save" onPress={() => confirm({ title: 'Apagar os dados deste save?', message: 'Talhões, safras, vendas, lançamentos, tarefas, máquinas e animais deste save serão apagados. Faça um backup antes se quiser guardar.', confirmLabel: 'Apagar dados', onConfirm: () => replaceAll({ ...emptyData(), settings: { ...st, demo: false } }) })} />
        </View>
      </Section>

      <FormSheet
        visible={sheet === 'password'}
        title="Trocar senha"
        fields={[
          { key: 'current', label: 'Senha atual', type: 'password', required: true },
          { key: 'next', label: 'Nova senha', type: 'password', required: true, hint: 'Pelo menos 6 caracteres.' },
        ]}
        initial={{ current: '', next: '' }}
        submitLabel="Trocar senha"
        onClose={() => setSheet(null)}
        onSubmit={async (v) => {
          try {
            await changePassword(v.current, v.next);
            setPwMsg('Senha trocada.');
          } catch (e: any) {
            setPwMsg(e?.message ?? 'Não foi possível trocar a senha.');
          }
          setSheet(null);
        }}
      />
      <FormSheet
        visible={sheet === 'link'}
        title="Conectar à conta do site"
        fields={[
          { key: 'url', label: 'Endereço do site', type: 'text', required: true, placeholder: 'https://seu-agrogestor.vercel.app' },
          { key: 'username', label: 'Usuário do site', type: 'text', required: true },
          { key: 'password', label: 'Senha do site', type: 'password', required: true, hint: 'Não tem conta no site? Crie lá primeiro.' },
        ]}
        initial={{ url: cloud.url, username: user?.username ?? '', password: '' }}
        submitLabel="Conectar"
        onClose={() => setSheet(null)}
        onSubmit={async (v) => {
          setLinkMsg('');
          try {
            await setServerUrl(v.url);
            await linkCloud(v.username, v.password);
          } catch (e: any) {
            setLinkMsg(e?.message ?? 'Não foi possível conectar.');
          }
          setSheet(null);
        }}
      />
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
