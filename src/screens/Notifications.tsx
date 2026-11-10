import { Bell, ChevronRight, HandCoins, ListChecks, Map as MapIcon, PawPrint, Sprout, Wheat, Wrench } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { farmAlerts, FarmAlert } from '../alerts';
import { enableSystemNotifications } from '../notify';
import { useStore } from '../store';
import { c } from '../theme';
import { Btn, Card, Empty, Screen, T } from '../ui';
import { Nav } from './common';

const TONE = { yellow: { bg: c.harvestSoft, fg: c.harvestInk }, blue: { bg: c.sellSoft, fg: c.sell }, green: { bg: c.primarySoft, fg: c.primaryDark }, red: { bg: c.dangerSoft, fg: c.danger } };
const ICON: Record<FarmAlert['kind'], React.ComponentType<{ size?: number; color?: string }>> = { colheita: Wheat, venda: HandCoins, tarefa: ListChecks, revisao: Wrench, solo: MapIcon, plantio: Sprout, animal: PawPrint };

export default function Notifications({ go }: Nav) {
  const { data, now, markRead, setSettings } = useStore();
  const alerts = farmAlerts(data, now);
  const unread = alerts.filter((a) => !data.readAlerts.includes(a.id));
  const on = data.settings.systemNotifications;

  return (
    <Screen
      title="Avisos"
      subtitle={alerts.length ? `${alerts.length} ${alerts.length === 1 ? 'aviso' : 'avisos'}, ${unread.length} ${unread.length === 1 ? 'novo' : 'novos'}` : 'O que a fazenda pede de você agora'}
      action={unread.length ? <Btn small kind="ghost" label="Marcar todos como lidos" onPress={() => markRead(alerts.map((a) => a.id))} /> : undefined}
    >
      {!on ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }} pad={14}>
          <Bell size={20} color={c.primary} />
          <T style={{ flex: 1, minWidth: 200 }}>Receba os avisos novos também na barra de notificações do aparelho.</T>
          <Btn small label="Ativar notificações" onPress={async () => setSettings({ systemNotifications: await enableSystemNotifications() })} />
        </Card>
      ) : null}

      <Card pad={0}>
        {alerts.length === 0 ? <Empty title="Nenhum aviso" hint="Colheitas prontas, melhores meses de venda, tarefas atrasadas, revisões e saúde dos animais aparecem aqui." /> : null}
        {alerts.map((a, i) => {
          const Icon = ICON[a.kind];
          const isNew = !data.readAlerts.includes(a.id);
          return (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              onPress={() => {
                markRead([a.id]);
                go(a.route);
              }}
              style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }, pressed && { backgroundColor: c.surfaceAlt }]}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: TONE[a.tone].bg, alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={19} color={TONE[a.tone].fg} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: isNew ? '700' : '500' }}>{a.title}</T>
                <T v="small">{a.detail}</T>
              </View>
              {isNew ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.danger }} /> : null}
              <ChevronRight size={16} color={c.faint} />
            </Pressable>
          );
        })}
      </Card>
      <T v="small">Os avisos acompanham o mês do jogo. Ao avançar o mês no painel, os novos entram aqui.</T>
    </Screen>
  );
}
