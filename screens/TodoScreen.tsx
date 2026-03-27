import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  Switch,
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
  Dimensions,
  ListRenderItemInfo,
} from 'react-native';

type Priority = 'low' | 'medium' | 'high';
interface Todo {
  id: string;
  text: string;
  done: boolean;
  priority: Priority;
  createdAt: number;
}
type FilterType = 'all' | 'active' | 'done';

const PRIORITY_COLOR: Record<Priority, string> = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#F44336',
};
const PRIORITY_LABEL: Record<Priority, string> = { low: '低', medium: '中', high: '高' };
const { width: SCREEN_WIDTH } = Dimensions.get('window');

function usePrevious<T>(value: T) {
  const ref = useRef<T>(value);
  useEffect(() => { ref.current = value; });
  return ref.current;
}

const PrioritySelector: React.FC<{ value: Priority; onChange: (p: Priority) => void }> = ({ value, onChange }) => (
  <View style={styles.priorityRow}>
    {(['low', 'medium', 'high'] as Priority[]).map((p) => (
      <TouchableOpacity
        key={p}
        style={[styles.priorityBtn, { borderColor: PRIORITY_COLOR[p] }, value === p && { backgroundColor: PRIORITY_COLOR[p] }]}
        onPress={() => onChange(p)}
        activeOpacity={0.7}>
        <Text style={[styles.priorityBtnText, value === p && { color: '#fff' }]}>
          {PRIORITY_LABEL[p]}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const TodoCard: React.FC<{ item: Todo; onToggle: (id: string) => void; onDelete: (id: string) => void }> = ({ item, onToggle, onDelete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handleDelete = useCallback(() => {
    Alert.alert('删除确认', `确定要删除「${item.text}」吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  }, [item, onDelete]);

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <View style={[styles.priorityStrip, { backgroundColor: PRIORITY_COLOR[item.priority] }]} />
      <View style={styles.cardContent}>
        <TouchableOpacity style={styles.cardLeft} onPress={() => onToggle(item.id)} activeOpacity={0.7}>
          <View style={[styles.checkbox, item.done && { backgroundColor: PRIORITY_COLOR[item.priority], borderColor: PRIORITY_COLOR[item.priority] }]}>
            {item.done && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={[styles.cardText, item.done && styles.cardTextDone]} numberOfLines={2}>{item.text}</Text>
            <Text style={styles.cardMeta}>优先级：{PRIORITY_LABEL[item.priority]} · {new Date(item.createdAt).toLocaleTimeString()}</Text>
          </View>
        </TouchableOpacity>
        <Pressable style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.5 }]} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

const StatsBar: React.FC<{ total: number; done: number }> = ({ total, done }) => {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, { toValue: pct / 100, duration: 400, useNativeDriver: false }).start();
  }, [pct, progressAnim]);
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={styles.statsBar}>
      <View style={styles.statsTextRow}>
        <Text style={styles.statsText}>已完成 {done}/{total}</Text>
        <Text style={styles.statsText}>{pct}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
    </View>
  );
};

const AddModal: React.FC<{ visible: boolean; onClose: () => void; onAdd: (text: string, priority: Priority) => void }> = ({ visible, onClose, onAdd }) => {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) { setTimeout(() => inputRef.current?.focus(), 200); }
    else { setText(''); setPriority('medium'); }
  }, [visible]);

  const handleAdd = () => {
    const trimmed = text.trim();
    if (!trimmed) { Alert.alert('提示', '请输入待办事项内容'); return; }
    onAdd(trimmed, priority);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>新增待办</Text>
          <TextInput
            ref={inputRef}
            style={styles.modalInput}
            placeholder="输入待办内容..."
            placeholderTextColor="#aaa"
            value={text}
            onChangeText={setText}
            maxLength={100}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <Text style={styles.modalLabel}>优先级</Text>
          <PrioritySelector value={priority} onChange={setPriority} />
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={onClose}>
              <Text style={styles.modalBtnCancelText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnConfirm]} onPress={handleAdd}>
              <Text style={styles.modalBtnConfirmText}>添加</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default function TodoScreen() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: '1', text: '学习 React Native 基础', done: false, priority: 'high', createdAt: Date.now() - 3000 },
    { id: '2', text: '完成项目需求文档', done: true, priority: 'medium', createdAt: Date.now() - 2000 },
    { id: '3', text: '喝一杯咖啡', done: false, priority: 'low', createdAt: Date.now() - 1000 },
  ]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const prevCount = usePrevious(todos.length);

  useEffect(() => { console.log(`Todo 数量从 ${prevCount} 变为 ${todos.length}`); }, [todos.length, prevCount]);
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const filteredTodos = useMemo(() => {
    return todos
      .filter((t) => { if (filter === 'active') return !t.done; if (filter === 'done') return t.done; return true; })
      .filter((t) => searchText ? t.text.toLowerCase().includes(searchText.toLowerCase()) : true)
      .sort((a, b) => ({ high: 0, medium: 1, low: 2 } as Record<Priority, number>)[a.priority] - ({ high: 0, medium: 1, low: 2 } as Record<Priority, number>)[b.priority]);
  }, [todos, filter, searchText]);

  const doneCount = useMemo(() => todos.filter((t) => t.done).length, [todos]);
  const handleToggle = useCallback((id: string) => setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t)), []);
  const handleDelete = useCallback((id: string) => setTodos((prev) => prev.filter((t) => t.id !== id)), []);
  const handleAdd = useCallback((text: string, priority: Priority) => {
    setTodos((prev) => [{ id: Date.now().toString(), text, priority, done: false, createdAt: Date.now() }, ...prev]);
  }, []);
  const handleClearDone = () => {
    const doneItems = todos.filter((t) => t.done);
    if (doneItems.length === 0) { Alert.alert('提示', '没有已完成的待办'); return; }
    Alert.alert('清空确认', `将删除 ${doneItems.length} 条已完成项目`, [
      { text: '取消', style: 'cancel' },
      { text: '确认', style: 'destructive', onPress: () => setTodos((prev) => prev.filter((t) => !t.done)) },
    ]);
  };

  const renderItem = useCallback(({ item }: ListRenderItemInfo<Todo>) => (
    <TodoCard item={item} onToggle={handleToggle} onDelete={handleDelete} />
  ), [handleToggle, handleDelete]);

  const theme = darkMode ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <View style={styles.headerLeft}>
          <Image source={{ uri: 'https://reactnative.dev/img/tiny_logo.png' }} style={styles.logo} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>我的待办</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.darkModeLabel}>{darkMode ? '🌙' : '☀️'}</Text>
          <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ false: '#ccc', true: '#6C63FF' }} thumbColor={'#fff'} />
        </View>
      </View>

      <StatsBar total={todos.length} done={doneCount} />

      <View style={[styles.searchWrap, { backgroundColor: theme.card }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput style={[styles.searchInput, { color: theme.text }]} placeholder="搜索待办..." placeholderTextColor={theme.subText} value={searchText} onChangeText={setSearchText} />
      </View>

      <View style={styles.filterRow}>
        {(['all', 'active', 'done'] as FilterType[]).map((f) => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
              {f === 'all' ? '全部' : f === 'active' ? '进行中' : '已完成'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={[styles.loadingText, { color: theme.subText }]}>加载中...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTodos}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={[styles.emptyText, { color: theme.subText }]}>暂无待办事项</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={[styles.bottomBar, { backgroundColor: theme.header }]}>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClearDone}>
          <Text style={styles.clearBtnText}>清空已完成</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      </View>

      <AddModal visible={modalVisible} onClose={() => setModalVisible(false)} onAdd={handleAdd} />
    </SafeAreaView>
  );
}

const lightTheme = { bg: '#F5F5F5', header: '#FFFFFF', card: '#FFFFFF', text: '#1A1A2E', subText: '#888' };
const darkTheme = { bg: '#1A1A2E', header: '#16213E', card: '#0F3460', text: '#E0E0E0', subText: '#aaa' };

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  darkModeLabel: { fontSize: 18, marginRight: 6 },
  statsBar: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#6C63FF' },
  statsTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statsText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 12, borderRadius: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, height: 42, fontSize: 15 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4 },
  filterBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', marginHorizontal: 4 },
  filterBtnActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  filterBtnText: { fontSize: 13, color: '#888', fontWeight: '500' },
  filterBtnTextActive: { color: '#fff', fontWeight: '700' },
  listContent: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, marginTop: 12 },
  emptyWrap: { paddingTop: 60, alignItems: 'center' },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, marginTop: 12 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, width: SCREEN_WIDTH - 24 },
  priorityStrip: { width: 5 },
  cardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  cardTextWrap: { flex: 1 },
  cardText: { fontSize: 15, color: '#1A1A2E', fontWeight: '500' },
  cardTextDone: { textDecorationLine: 'line-through', color: '#aaa' },
  cardMeta: { fontSize: 11, color: '#aaa', marginTop: 3 },
  deleteBtn: { padding: 6, marginLeft: 8 },
  deleteBtnText: { fontSize: 16, color: '#ccc' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  clearBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#F44336' },
  clearBtnText: { color: '#F44336', fontSize: 13, fontWeight: '600' },
  fab: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32, fontWeight: '300' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#1A1A2E', marginBottom: 16 },
  modalLabel: { fontSize: 14, color: '#888', marginBottom: 8, fontWeight: '500' },
  modalActions: { flexDirection: 'row', marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', marginHorizontal: 6 },
  modalBtnCancel: { backgroundColor: '#f5f5f5' },
  modalBtnCancelText: { color: '#888', fontSize: 15, fontWeight: '600' },
  modalBtnConfirm: { backgroundColor: '#6C63FF' },
  modalBtnConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  priorityRow: { flexDirection: 'row' },
  priorityBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 2, alignItems: 'center', marginHorizontal: 4 },
  priorityBtnText: { fontSize: 14, fontWeight: '600', color: '#555' },
});
