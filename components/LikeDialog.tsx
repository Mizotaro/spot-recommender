'use client';

import React, { useState } from 'react';

const STATUS_OPTIONS = [
  { value: 'visited',    label: '訪問済み', icon: '✅' },
  { value: 'want_to_go', label: '行きたい',  icon: '🎯' },
  { value: 'interested', label: '気になる',  icon: '💭' },
];

interface LikeDialogProps {
  placeName: string;
  onConfirm: (memo: string, status: string) => void;
  onCancel: () => void;
}

export default function LikeDialog({ placeName, onConfirm, onCancel }: LikeDialogProps) {
  const [status, setStatus] = useState('want_to_go');
  const [memo, setMemo] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-lg mb-1">❤️ いいね</h3>
        <p className="text-sm text-gray-500 mb-4 truncate">{placeName}</p>

        {/* ステータス選択 */}
        <p className="text-xs font-semibold text-gray-500 mb-2">ステータス</p>
        <div className="flex gap-2 mb-4">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={`flex-1 flex flex-col items-center py-2 px-1 rounded-lg border-2 text-xs font-semibold transition ${
                status === opt.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className="text-xl mb-0.5">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        {/* メモ入力 */}
        <p className="text-xs font-semibold text-gray-500 mb-2">メモ（任意）</p>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="感想やメモを入力..."
          rows={3}
          className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 mb-4"
        />

        {/* ボタン */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            キャンセル
          </button>
          <button
            onClick={() => onConfirm(memo.trim(), status)}
            className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}
