import { useVideoPlayer, VideoView } from 'expo-video';
import { Clapperboard, Film, Play, Video as VideoIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, StyleProp, View, ViewStyle } from 'react-native';
import { MAX_VIDEO_MB, pickVideo, useVideo } from './media';
import { Pulse } from './motion';
import { c, radius } from './theme';
import { Btn, T } from './ui';

/** Player com controles. Toca no celular (ExoPlayer) e no desktop (<video>). */
export function VideoPlayer({ uri: ref, style, autoPlay }: { uri?: string; style?: StyleProp<ViewStyle>; autoPlay?: boolean }) {
  const src = useVideo(ref);
  if (!src) {
    return (
      <View style={[{ backgroundColor: c.sidebar, alignItems: 'center', justifyContent: 'center', aspectRatio: 16 / 9 }, style]}>
        {ref ? <ActivityIndicator color="#fff" /> : <Film size={28} color={c.sidebarInk} />}
      </View>
    );
  }
  return <LoadedPlayer src={src} style={style} autoPlay={autoPlay} />;
}

function LoadedPlayer({ src, style, autoPlay }: { src: string; style?: StyleProp<ViewStyle>; autoPlay?: boolean }) {
  const player = useVideoPlayer(src, (p) => {
    p.loop = false;
    if (autoPlay) p.play();
  });
  return (
    <View style={[{ backgroundColor: '#000', aspectRatio: 16 / 9, overflow: 'hidden' }, style]}>
      <VideoView player={player} style={{ width: '100%', height: '100%' }} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }} allowsPictureInPicture />
    </View>
  );
}

/** Selo de "vídeo" sobre a miniatura da galeria. */
export function VideoBadge({ big }: { big?: boolean }) {
  const size = big ? 46 : 26;
  return (
    <Pulse amount={0.1} period={1800}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(18,48,31,0.82)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' }}>
        <Play size={big ? 20 : 12} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
      </View>
    </Pulse>
  );
}

/** Miniatura de um registro que só tem vídeo. */
export function VideoTile({ style, label }: { style?: StyleProp<ViewStyle>; label?: string }) {
  return (
    <View style={[{ backgroundColor: c.sidebar, alignItems: 'center', justifyContent: 'center', gap: 6 }, style]}>
      <VideoBadge big />
      {label ? <T style={{ color: c.sidebarInk, fontSize: 12, fontWeight: '600' }}>{label}</T> : null}
    </View>
  );
}

/** Campo de formulário: escolher da galeria, gravar (celular) ou remover. */
export function VideoInput({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choose = async (source: 'library' | 'camera') => {
    setBusy(true);
    setError('');
    try {
      const res = await pickVideo(source);
      if (res && 'ref' in res) onChange(res.ref);
      else if (res && 'error' in res) setError(res.error);
    } catch {
      setError('Não foi possível abrir o vídeo.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 8 }}>
      {value ? (
        <VideoPlayer uri={value} style={{ borderRadius: radius.md, width: '100%' }} />
      ) : (
        <View style={{ height: 72, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          {busy ? <ActivityIndicator color={c.primary} /> : <Clapperboard size={24} color={c.primaryDark} />}
        </View>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Btn small kind="ghost" label={busy ? 'Abrindo…' : value ? 'Trocar' : 'Escolher vídeo'} onPress={() => choose('library')} disabled={busy} />
        {Platform.OS !== 'web' ? <Btn small kind="ghost" label="Gravar" icon={<VideoIcon size={14} color={c.ink} />} onPress={() => choose('camera')} disabled={busy} /> : null}
        {value ? <Btn small kind="ghost" label="Remover" onPress={() => onChange(undefined)} /> : null}
      </View>
      {error ? <T v="small" style={{ color: c.danger }}>{error}</T> : <T v="small">{Platform.OS === 'web' ? `Até ${MAX_VIDEO_MB} MB, de uma pasta do computador.` : 'Da galeria ou gravado agora.'}</T>}
    </View>
  );
}
