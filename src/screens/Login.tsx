import { Check, Eye, EyeOff, Wheat } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { checkLogin } from '../auth';
import { useStore } from '../store';
import { c, font } from '../theme';

export default function Login() {
  const { login } = useStore();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const enter = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const passRef = useRef<React.ElementRef<typeof TextInput>>(null);

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [enter]);

  const submit = () => {
    if (checkLogin(user, password)) return login(remember);
    setError('Usuário ou senha incorretos. Confira e tente de novo.');
    shake.setValue(0);
    Animated.sequence([6, -6, 4, -4, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 50, useNativeDriver: Platform.OS !== 'web' }))).start();
  };

  const input = { fontFamily: font, fontSize: 15.5, color: c.ink, borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: c.surface, minHeight: 48 } as const;
  const label = { fontFamily: font, fontSize: 13, fontWeight: '600', color: c.ink, marginBottom: 6 } as const;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.sidebar }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 22 }} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ width: '100%', maxWidth: 400, alignSelf: 'center', opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
          <View style={{ alignItems: 'center', marginBottom: 26 }}>
            <View style={{ width: 68, height: 68, borderRadius: 20, backgroundColor: c.harvest, alignItems: 'center', justifyContent: 'center' }}>
              <Wheat size={38} color={c.sidebar} />
            </View>
            <Text style={{ fontFamily: font, color: '#fff', fontSize: 30, fontWeight: '700', letterSpacing: -0.6, marginTop: 14 }}>AgroGestor</Text>
            <Text style={{ fontFamily: font, color: c.sidebarInk, fontSize: 14.5, marginTop: 4, textAlign: 'center' }}>A administração da sua fazenda no Farming Simulator 25</Text>
          </View>

          <Animated.View style={{ backgroundColor: c.surface, borderRadius: 20, padding: 20, transform: [{ translateX: shake }] }}>
            <Text style={label}>Usuário</Text>
            <TextInput value={user} onChangeText={(t) => { setUser(t); setError(''); }} autoCapitalize="none" autoCorrect={false} placeholder="Nome da fazenda" placeholderTextColor={c.faint} returnKeyType="next" onSubmitEditing={() => passRef.current?.focus()} style={input} />
            <Text style={[label, { marginTop: 14 }]}>Senha</Text>
            <View>
              <TextInput ref={passRef} value={password} onChangeText={(t) => { setPassword(t); setError(''); }} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} placeholder="Sua senha" placeholderTextColor={c.faint} returnKeyType="go" onSubmitEditing={submit} style={[input, { paddingRight: 50 }]} />
              <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Ocultar senha' : 'Mostrar senha'} onPress={() => setShow((v) => !v)} hitSlop={8} style={{ position: 'absolute', right: 6, top: 6, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                {show ? <EyeOff size={19} color={c.muted} /> : <Eye size={19} color={c.muted} />}
              </Pressable>
            </View>
            {error ? <Text style={{ fontFamily: font, color: c.danger, fontSize: 13, marginTop: 10 }}>{error}</Text> : null}

            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: remember }} onPress={() => setRemember((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: remember ? c.primary : c.faint, backgroundColor: remember ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {remember ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
              </View>
              <Text style={{ fontFamily: font, fontSize: 14, color: c.ink }}>Manter conectado neste aparelho</Text>
            </Pressable>

            <Pressable accessibilityRole="button" onPress={submit} style={({ pressed }) => [{ backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 18, opacity: pressed ? 0.85 : 1 }]}>
              <Text style={{ fontFamily: font, color: '#fff', fontSize: 15.5, fontWeight: '700' }}>Entrar</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
