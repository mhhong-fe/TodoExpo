import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  Modal,
  Alert,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, Audio, ResizeMode, AVPlaybackStatus } from 'expo-av';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMG_SIZE = (SCREEN_WIDTH - 48) / 3;

type MediaTab = 'image' | 'video' | 'audio';

// ─── 图片预览 Modal ────────────────────────────
const ImagePreviewModal: React.FC<{
  uri: string | null;
  onClose: () => void;
}> = ({ uri, onClose }) => (
  <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={onClose}>
      {uri && (
        <Image
          source={{ uri }}
          style={styles.previewImage}
          resizeMode="contain"
        />
      )}
      <View style={styles.previewClose}>
        <Text style={styles.previewCloseText}>✕ 关闭</Text>
      </View>
    </TouchableOpacity>
  </Modal>
);

// ─── 图片 Tab ──────────────────────────────────
const ImageTab: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相册访问权限才能选择图片');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 9,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...uris, ...prev]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相机权限才能拍照');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setImages((prev) => [result.assets[0].uri, ...prev]);
    }
  };

  const removeImage = (uri: string) => {
    Alert.alert('删除图片', '确认删除这张图片？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => setImages((prev) => prev.filter((u) => u !== uri)) },
    ]);
  };

  return (
    <View style={styles.tabContent}>
      {/* 操作按钮 */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={takePhoto}>
          <Text style={styles.actionBtnIcon}>📷</Text>
          <Text style={styles.actionBtnText}>拍照</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={pickImages}>
          <Text style={styles.actionBtnIcon}>🖼️</Text>
          <Text style={styles.actionBtnText}>从相册选择</Text>
        </TouchableOpacity>
      </View>

      {images.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🗂️</Text>
          <Text style={styles.emptyText}>暂无图片，点击上方按钮添加</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>已选图片（{images.length}）</Text>
          <FlatList
            data={images}
            keyExtractor={(item) => item}
            numColumns={3}
            contentContainerStyle={styles.imageGrid}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => setPreviewUri(item)} onLongPress={() => removeImage(item)}>
                <Image source={{ uri: item }} style={styles.thumbnail} resizeMode="cover" />
                <View style={styles.thumbnailHint}>
                  <Text style={styles.thumbnailHintText}>长按删除</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </>
      )}
      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
    </View>
  );
};

// ─── 视频 Tab ──────────────────────────────────
const VideoTab: React.FC = () => {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const videoRef = useRef<Video>(null);

  const pickVideo = async () => {
    const { status: perm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm !== 'granted') {
      Alert.alert('权限不足', '需要相册访问权限');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!result.canceled) {
      setVideoUri(result.assets[0].uri);
      setStatus(null);
    }
  };

  const recordVideo = async () => {
    const { status: perm } = await ImagePicker.requestCameraPermissionsAsync();
    if (perm !== 'granted') {
      Alert.alert('权限不足', '需要相机权限');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 60,
    });
    if (!result.canceled) {
      setVideoUri(result.assets[0].uri);
      setStatus(null);
    }
  };

  const isPlaying = status?.isLoaded && status.isPlaying;
  const duration = status?.isLoaded ? status.durationMillis ?? 0 : 0;
  const position = status?.isLoaded ? status.positionMillis ?? 0 : 0;
  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.tabContent}>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={recordVideo}>
          <Text style={styles.actionBtnIcon}>🎥</Text>
          <Text style={styles.actionBtnText}>录制视频</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={pickVideo}>
          <Text style={styles.actionBtnIcon}>📂</Text>
          <Text style={styles.actionBtnText}>从相册选择</Text>
        </TouchableOpacity>
      </View>

      {!videoUri ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyText}>暂无视频，点击上方按钮添加</Text>
        </View>
      ) : (
        <View style={styles.videoWrap}>
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={styles.videoPlayer}
            resizeMode={ResizeMode.CONTAIN}
            onPlaybackStatusUpdate={(s) => setStatus(s)}
            useNativeControls={false}
          />
          {/* 进度条 */}
          <View style={styles.videoProgressTrack}>
            <View style={[styles.videoProgressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.videoTime}>
            {msToTime(position)} / {msToTime(duration)}
          </Text>
          {/* 控制按钮 */}
          <View style={styles.videoControls}>
            <TouchableOpacity style={styles.videoCtrlBtn} onPress={() => videoRef.current?.setPositionAsync(0)}>
              <Text style={styles.videoCtrlText}>⏮</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.videoCtrlBtn, styles.videoPlayBtn]}
              onPress={() => isPlaying ? videoRef.current?.pauseAsync() : videoRef.current?.playAsync()}>
              <Text style={styles.videoPlayText}>{isPlaying ? '⏸' : '▶'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.videoCtrlBtn} onPress={() => { setVideoUri(null); }}>
              <Text style={styles.videoCtrlText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

function msToTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ─── 音频 Tab ──────────────────────────────────
const AudioTab: React.FC = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordings, setRecordings] = useState<{ uri: string; duration: string; name: string }[]>([]);
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 清理 sound
  useEffect(() => {
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('权限不足', '需要麦克风权限'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch (e) {
      Alert.alert('录音失败', String(e));
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    if (timerRef.current) clearInterval(timerRef.current);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = recording.getURI();
    if (uri) {
      setRecordings((prev) => [
        { uri, duration: msToTime(recSeconds * 1000), name: `录音 ${prev.length + 1}` },
        ...prev,
      ]);
    }
    setRecording(null);
    setIsRecording(false);
    setRecSeconds(0);
  };

  const playAudio = async (uri: string) => {
    try {
      // 停止正在播放的
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        if (playingUri === uri) { setPlayingUri(null); return; }
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => { if (status.isLoaded && status.didJustFinish) { setPlayingUri(null); } }
      );
      soundRef.current = sound;
      setPlayingUri(uri);
    } catch (e) {
      Alert.alert('播放失败', String(e));
    }
  };

  const deleteRecording = (uri: string) => {
    Alert.alert('删除录音', '确认删除？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => {
        if (playingUri === uri) { soundRef.current?.stopAsync(); setPlayingUri(null); }
        setRecordings((prev) => prev.filter((r) => r.uri !== uri));
      }},
    ]);
  };

  return (
    <View style={styles.tabContent}>
      {/* 录音控件 */}
      <View style={styles.recorderWrap}>
        <View style={styles.recorderVisual}>
          {isRecording ? (
            <>
              <View style={styles.recDot} />
              <Text style={styles.recTime}>{msToTime(recSeconds * 1000)}</Text>
            </>
          ) : (
            <Text style={styles.recIdle}>🎙️</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.recBtn, isRecording && styles.recBtnActive]}
          onPress={isRecording ? stopRecording : startRecording}
          activeOpacity={0.8}>
          <Text style={styles.recBtnText}>{isRecording ? '⏹ 停止录音' : '⏺ 开始录音'}</Text>
        </TouchableOpacity>
      </View>

      {recordings.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🎵</Text>
          <Text style={styles.emptyText}>暂无录音，点击上方按钮开始</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>录音列表（{recordings.length}）</Text>
          <ScrollView>
            {recordings.map((r) => (
              <View key={r.uri} style={styles.audioItem}>
                <TouchableOpacity style={styles.audioPlayBtn} onPress={() => playAudio(r.uri)}>
                  <Text style={styles.audioPlayIcon}>{playingUri === r.uri ? '⏸' : '▶'}</Text>
                </TouchableOpacity>
                <View style={styles.audioInfo}>
                  <Text style={styles.audioName}>{r.name}</Text>
                  <Text style={styles.audioDuration}>{r.duration}</Text>
                </View>
                {playingUri === r.uri && (
                  <View style={styles.audioWave}>
                    {[4, 8, 12, 8, 4, 10, 6].map((h, i) => (
                      <View key={i} style={[styles.audioBar, { height: h * 2 }]} />
                    ))}
                  </View>
                )}
                <TouchableOpacity onPress={() => deleteRecording(r.uri)} style={styles.audioDeleteBtn}>
                  <Text style={styles.audioDeleteText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
};

// ─── 主屏幕 ────────────────────────────────────
export default function MediaScreen() {
  const [activeTab, setActiveTab] = useState<MediaTab>('image');

  const tabs: { key: MediaTab; label: string; icon: string }[] = [
    { key: 'image', label: '图片', icon: '🖼️' },
    { key: 'video', label: '视频', icon: '🎬' },
    { key: 'audio', label: '音频', icon: '🎵' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 顶部标题 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>媒体中心</Text>
      </View>

      {/* Tab 切换 */}
      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}>
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 内容区 */}
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {activeTab === 'image' && <ImageTab />}
        {activeTab === 'video' && <VideoTab />}
        {activeTab === 'audio' && <AudioTab />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#6C63FF' },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 13, color: '#888', marginTop: 2, fontWeight: '500' },
  tabLabelActive: { color: '#6C63FF', fontWeight: '700' },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  // 操作按钮
  actionRow: { flexDirection: 'row', marginBottom: 16 },
  actionBtn: { flex: 1, alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, marginHorizontal: 6, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  actionBtnIcon: { fontSize: 28 },
  actionBtnText: { fontSize: 13, color: '#555', marginTop: 4, fontWeight: '500' },
  // 空状态
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: '#aaa', marginTop: 12 },
  sectionLabel: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 10 },
  // 图片网格
  imageGrid: { paddingBottom: 20 },
  thumbnail: { width: IMG_SIZE, height: IMG_SIZE, margin: 2, borderRadius: 8 },
  thumbnailHint: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  thumbnailHintText: { color: '#fff', fontSize: 9 },
  // 预览
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH },
  previewClose: { position: 'absolute', top: 60, right: 20, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  previewCloseText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  // 视频播放器
  videoWrap: { backgroundColor: '#000', borderRadius: 12, overflow: 'hidden' },
  videoPlayer: { width: '100%', height: 220 },
  videoProgressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 0 },
  videoProgressFill: { height: '100%', backgroundColor: '#6C63FF' },
  videoTime: { color: '#aaa', fontSize: 12, textAlign: 'center', paddingVertical: 6 },
  videoControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: 20 },
  videoCtrlBtn: { padding: 10 },
  videoCtrlText: { fontSize: 24 },
  videoPlayBtn: { backgroundColor: '#6C63FF', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  videoPlayText: { fontSize: 24, color: '#fff' },
  // 录音器
  recorderWrap: { backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  recorderVisual: { height: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  recDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#F44336', marginBottom: 8 },
  recTime: { fontSize: 24, fontWeight: '700', color: '#F44336', fontVariant: ['tabular-nums'] },
  recIdle: { fontSize: 48 },
  recBtn: { backgroundColor: '#6C63FF', paddingVertical: 14, paddingHorizontal: 36, borderRadius: 30 },
  recBtnActive: { backgroundColor: '#F44336' },
  recBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // 音频列表
  audioItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  audioPlayBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center' },
  audioPlayIcon: { fontSize: 18, color: '#fff' },
  audioInfo: { flex: 1, marginLeft: 12 },
  audioName: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  audioDuration: { fontSize: 12, color: '#aaa', marginTop: 2 },
  audioWave: { flexDirection: 'row', alignItems: 'center', gap: 2, marginRight: 8 },
  audioBar: { width: 3, backgroundColor: '#6C63FF', borderRadius: 2 },
  audioDeleteBtn: { padding: 8 },
  audioDeleteText: { fontSize: 18 },
});
