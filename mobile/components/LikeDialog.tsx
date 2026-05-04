import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';

const STATUS_OPTIONS = [
  { value: 'visited',    label: '訪問済み', icon: '✅' },
  { value: 'want_to_go', label: '行きたい',  icon: '🎯' },
  { value: 'interested', label: '気になる',  icon: '💭' },
];

interface Props {
  visible: boolean;
  placeName: string;
  onConfirm: (memo: string, status: string) => void;
  onCancel: () => void;
}

export default function LikeDialog({ visible, placeName, onConfirm, onCancel }: Props) {
  const [status, setStatus] = useState('want_to_go');
  const [memo, setMemo] = useState('');

  const handleConfirm = () => {
    onConfirm(memo.trim(), status);
    setMemo('');
    setStatus('want_to_go');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.title}>❤️ いいね</Text>
          <Text style={s.sub} numberOfLines={1}>{placeName}</Text>

          <Text style={s.label}>ステータス</Text>
          <View style={s.statusRow}>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setStatus(opt.value)}
                style={[s.statusBtn, status === opt.value && s.statusBtnActive]}
              >
                <Text style={s.statusIcon}>{opt.icon}</Text>
                <Text style={[s.statusLabel, status === opt.value && s.statusLabelActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>メモ（任意）</Text>
          <TextInput
            style={s.input}
            value={memo}
            onChangeText={setMemo}
            placeholder="感想やメモを入力..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={s.btnRow}>
            <TouchableOpacity onPress={onCancel} style={s.cancelBtn}>
              <Text style={s.cancelText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={s.confirmBtn}>
              <Text style={s.confirmText}>保存する</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 360 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  sub: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 8 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 10, borderWidth: 2, borderColor: '#e5e7eb',
  },
  statusBtnActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  statusIcon: { fontSize: 20, marginBottom: 2 },
  statusLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  statusLabelActive: { color: '#1d4ed8' },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    padding: 10, fontSize: 13, height: 72, marginBottom: 16,
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center',
  },
  cancelText: { fontSize: 13, color: '#6b7280' },
  confirmBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    backgroundColor: '#22c55e', alignItems: 'center',
  },
  confirmText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
