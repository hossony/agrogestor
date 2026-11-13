import { Check, Eye, EyeOff, Wheat } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Sway } from '../motion';
import { useStore } from '../store';
import { c, font } from '../theme';

type Mode = 'entrar' | 'cadastrar';

/** Entrada e cadastro de contas locais (ficam só neste aparelho). */
export default function Login() {
  const { login, register, cloud, setServerUrl } = useStore();
  const [server, setServer] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('entrar');
  const [name, setName] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const enter = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const swap = useRef(new Animated.Value(1)).current;
  const native = Platform.OS !== 'web';

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 500, useNativeDriver: native }).start();
  }, [enter, native]);

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setError('');
    Animated.timing(swap, { toValue: 0, duration: 110, useNativeDriver: native }).start(() => {
      setMode(m);
      Animated.spring(swap, { toValue: 1, useNativeDriver: native, speed: 16, bounciness: 6 }).start();
    });
  };

  const fail = (msg: string) => {
    setError(msg);
    shake.setValue(0);
    Animated.sequence([6, -6, 4, -4, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 50, useNativeDriver: native }))).start();
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (server !== null && server.trim() !== cloud.url) await setServerUrl(server);
      if (mode === 'entrar') await login(user, password, remember);
      else await register({ name, username: user, password, confirm }, remember);
    } catch (e: any) {
      fail(e?.message ?? 'Não foi possível continuar.');
    } finally {
      setBusy(false);
    }
  };

  const input = { fontFamily: font, fontSize: 15.5, color: c.ink, borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: c.surface, minHeight: 48 } as const;
  const label = { fontFamily: font, fontSize: 13, fontWeight: '600', color: c.ink, marginBottom: 6, marginTop: 14 } as const;
  const clear = () => setError('');

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.sidebar }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 22 }} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{ width: 68, height: 68, borderRadius: 20, backgroundColor: c.harvest, alignItems: 'center', justifyContent: 'center' }}>
              <Sway deg={8}><Wheat size={38} color={c.sidebar} /></Sway>
            </View>
            <Text style={{ fontFamily: font, color: '#fff', fontSize: 30, fontWeight: '700', letterSpacing: -0.6, marginTop: 14 }}>AgroGestor</Text>
            <Text style={{ fontFamily: font, color: c.sidebarInk, fontSize: 14.5, marginTop: 4, textAlign: 'center' }}>O escritório da sua fazenda no Farming Simulator 25</Text>
          </View>

          <Animated.View style={{ backgroundColor: c.surface, borderRadius: 20, padding: 20, transform: [{ translateX: shake }] }}>
            <View style={{ flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: c.line }}>
              {(['entrar', 'cadastrar'] as Mode[]).map((m) => (
                <Pressable key={m} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} onPress={() => switchMode(m)} style={{ flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', backgroundColor: mode === m ? c.surface : 'transparent', borderWidth: 1, borderColor: mode === m ? c.line : 'transparent' }}>
                  <Text style={{ fontFamily: font, fontSize: 14, fontWeight: '700', color: mode === m ? c.ink : c.muted }}>{m === 'entrar' ? 'Entrar' : 'Criar conta'}</Text>
                </Pressable>
              ))}
            </View>

            <Animated.View style={{ opacity: swap, transform: [{ translateY: swap.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
              {mode === 'cadastrar' ? (
                <>
                  <Text style={label}>Seu nome</Text>
                  <TextInput accessibilityLabel="Seu nome" value={name} onChangeText={(t) => { setName(t); clear(); }} placeholder="Como quer ser chamado" placeholderTextColor={c.faint} style={input} />
                </>
              ) : null}
              <Text style={label}>Usuário</Text>
              <TextInput accessibilityLabel="Usuário" value={user} onChangeText={(t) => { setUser(t); clear(); }} autoCapitalize="none" autoCorrect={false} placeholder={mode === 'cadastrar' ? 'Ex.: joao.fazendeiro' : 'Seu usuário'} placeholderTextColor={c.faint} style={input} />
              <Text style={label}>Senha</Text>
              <View>
                <TextInput accessibilityLabel="Senha" value={password} onChangeText={(t) => { setPassword(t); clear(); }} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} placeholder={mode === 'cadastrar' ? 'Pelo menos 6 caracteres' : 'Sua senha'} placeholderTextColor={c.faint} returnKeyType="go" onSubmitEditing={mode === 'entrar' ? submit : undefined} style={[input, { paddingRight: 50 }]} />
                <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Ocultar senha' : 'Mostrar senha'} onPress={() => setShow((v) => !v)} hitSlop={8} style={{ position: 'absolute', right: 6, top: 6, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                  {show ? <EyeOff size={19} color={c.muted} /> : <Eye size={19} color={c.muted} />}
                </Pressable>
              </View>
              {mode === 'cadastrar' ? (
                <>
                  <Text style={label}>Confirme a senha</Text>
                  <TextInput accessibilityLabel="Confirme a senha" value={confirm} onChangeText={(t) => { setConfirm(t); clear(); }} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} placeholder="Repita a senha" placeholderTextColor={c.faint} returnKeyType="go" onSubmitEditing={submit} style={input} />
                </>
              ) : null}
            </Animated.View>

            {error ? <Text accessibilityRole="alert" style={{ fontFamily: font, color: c.danger, fontSize: 13, marginTop: 10 }}>{error}</Text> : null}

            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: remember }} onPress={() => setRemember((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: remember ? c.primary : c.faint, backgroundColor: remember ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {remember ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
              </View>
              <Text style={{ fontFamily: font, fontSize: 14, color: c.ink }}>Manter conectado neste aparelho</Text>
            </Pressable>

            <Pressable accessibilityRole="button" onPress={submit} disabled={busy} style={({ pressed }) => [{ backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 18, opacity: pressed || busy ? 0.85 : 1 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: font, color: '#fff', fontSize: 15.5, fontWeight: '700' }}>{mode === 'entrar' ? 'Entrar' : 'Criar conta'}</Text>}
            </Pressable>
          </Animated.View>

          <Text style={{ fontFamily: font, color: c.sidebarInk, fontSize: 12.5, textAlign: 'center', marginTop: 16, lineHeight: 18 }}>
            {cloud.url || (server ?? '').trim()
              ? 'Use a mesma conta do site: seus saves ficam iguais no celular, no computador e na web. Sem internet, o app continua funcionando e sincroniza depois.'
              : 'Sem o endereço do site, a conta e os dados ficam só neste aparelho.'}
          </Text>
          {server === null ? (
            <Pressable accessibilityRole="button" onPress={() => setServer(cloud.url)} style={{ alignSelf: 'center', marginTop: 8, padding: 6 }}>
              <Text style={{ fontFamily: font, color: c.harvest, fontSize: 12.5, fontWeight: '600' }}>{cloud.url ? `Site: ${cloud.url.replace(/^https?:\/\//, '')} · trocar` : 'Configurar endereço do site'}</Text>
            </Pressable>
          ) : (
            <View style={{ marginTop: 10 }}>
              <TextInput accessibilityLabel="Endereço do site" value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://seu-agrogestor.vercel.app" placeholderTextColor={c.faint} style={input} />
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
