/**
 * HOLLY AI - Internationalization (i18n)
 * Multi-language support system
 */

export type Language = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ja' | 'ko' | 'zh' | 'ar';

export interface Translations {
  common: {
    back: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    search: string;
    loading: string;
    error: string;
    success: string;
  };
  sidebar: {
    musicStudio: string;
    auraLab: string;
    codeWorkshop: string;
    library: string;
    memory: string;
    insights: string;
    settings: string;
    autonomy: string;
    newChat: string;
    searchConversations: string;
  };
  chat: {
    typeMessage: string;
    sendMessage: string;
    voiceInput: string;
    uploadFile: string;
    regenerate: string;
    copy: string;
    copySuccess: string;
  };
  features: {
    export: string;
    share: string;
    pin: string;
    unpin: string;
    archive: string;
    organize: string;
    customize: string;
    analytics: string;
    templates: string;
    files: string;
  };
}

const translations: Record<Language, Translations> = {
  en: {
    common: {
      back: 'Back',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      search: 'Search',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
    },
    sidebar: {
      musicStudio: 'Music Studio',
      auraLab: 'AURA A&R',
      codeWorkshop: 'Code Workshop',
      library: 'Library',
      memory: 'Memory',
      insights: 'Insights',
      settings: 'Settings',
      autonomy: 'Autonomy',
      newChat: 'New Chat',
      searchConversations: 'Search conversations...',
    },
    chat: {
      typeMessage: 'Type your message...',
      sendMessage: 'Send',
      voiceInput: 'Voice input',
      uploadFile: 'Upload file',
      regenerate: 'Regenerate',
      copy: 'Copy',
      copySuccess: 'Copied!',
    },
    features: {
      export: 'Export',
      share: 'Share',
      pin: 'Pin',
      unpin: 'Unpin',
      archive: 'Archive',
      organize: 'Organize',
      customize: 'Customize',
      analytics: 'Analytics',
      templates: 'Templates',
      files: 'Files',
    },
  },
  es: {
    common: {
      back: 'Volver',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      search: 'Buscar',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
    },
    sidebar: {
      musicStudio: 'Estudio Musical',
      auraLab: 'AURA A&R',
      codeWorkshop: 'Taller de Código',
      library: 'Biblioteca',
      memory: 'Memoria',
      insights: 'Perspectivas',
      settings: 'Configuración',
      autonomy: 'Autonomía',
      newChat: 'Nuevo Chat',
      searchConversations: 'Buscar conversaciones...',
    },
    chat: {
      typeMessage: 'Escribe tu mensaje...',
      sendMessage: 'Enviar',
      voiceInput: 'Entrada de voz',
      uploadFile: 'Subir archivo',
      regenerate: 'Regenerar',
      copy: 'Copiar',
      copySuccess: '¡Copiado!',
    },
    features: {
      export: 'Exportar',
      share: 'Compartir',
      pin: 'Fijar',
      unpin: 'Desfijar',
      archive: 'Archivar',
      organize: 'Organizar',
      customize: 'Personalizar',
      analytics: 'Analíticas',
      templates: 'Plantillas',
      files: 'Archivos',
    },
  },
  fr: {
    common: {
      back: 'Retour',
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      search: 'Rechercher',
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
    },
    sidebar: {
      musicStudio: 'Studio Musical',
      auraLab: 'AURA A&R',
      codeWorkshop: 'Atelier Code',
      library: 'Bibliothèque',
      memory: 'Mémoire',
      insights: 'Insights',
      settings: 'Paramètres',
      autonomy: 'Autonomie',
      newChat: 'Nouveau Chat',
      searchConversations: 'Rechercher conversations...',
    },
    chat: {
      typeMessage: 'Tapez votre message...',
      sendMessage: 'Envoyer',
      voiceInput: 'Entrée vocale',
      uploadFile: 'Télécharger fichier',
      regenerate: 'Régénérer',
      copy: 'Copier',
      copySuccess: 'Copié!',
    },
    features: {
      export: 'Exporter',
      share: 'Partager',
      pin: 'Épingler',
      unpin: 'Détacher',
      archive: 'Archiver',
      organize: 'Organiser',
      customize: 'Personnaliser',
      analytics: 'Analytiques',
      templates: 'Modèles',
      files: 'Fichiers',
    },
  },
  de: {
    common: {
      back: 'Zurück',
      save: 'Speichern',
      cancel: 'Abbrechen',
      delete: 'Löschen',
      edit: 'Bearbeiten',
      search: 'Suchen',
      loading: 'Laden...',
      error: 'Fehler',
      success: 'Erfolg',
    },
    sidebar: {
      musicStudio: 'Musikstudio',
      auraLab: 'AURA A&R',
      codeWorkshop: 'Code-Werkstatt',
      library: 'Bibliothek',
      memory: 'Speicher',
      insights: 'Einblicke',
      settings: 'Einstellungen',
      autonomy: 'Autonomie',
      newChat: 'Neuer Chat',
      searchConversations: 'Gespräche suchen...',
    },
    chat: {
      typeMessage: 'Nachricht eingeben...',
      sendMessage: 'Senden',
      voiceInput: 'Spracheingabe',
      uploadFile: 'Datei hochladen',
      regenerate: 'Regenerieren',
      copy: 'Kopieren',
      copySuccess: 'Kopiert!',
    },
    features: {
      export: 'Exportieren',
      share: 'Teilen',
      pin: 'Anheften',
      unpin: 'Lösen',
      archive: 'Archivieren',
      organize: 'Organisieren',
      customize: 'Anpassen',
      analytics: 'Analytik',
      templates: 'Vorlagen',
      files: 'Dateien',
    },
  },
  it: {
    common: {
      back: 'Indietro',
      save: 'Salva',
      cancel: 'Annulla',
      delete: 'Elimina',
      edit: 'Modifica',
      search: 'Cerca',
      loading: 'Caricamento...',
      error: 'Errore',
      success: 'Successo',
    },
    sidebar: {
      musicStudio: 'Studio Musicale',
      auraLab: 'AURA A&R',
      codeWorkshop: 'Laboratorio Codice',
      library: 'Biblioteca',
      memory: 'Memoria',
      insights: 'Approfondimenti',
      settings: 'Impostazioni',
      autonomy: 'Autonomia',
      newChat: 'Nuova Chat',
      searchConversations: 'Cerca conversazioni...',
    },
    chat: {
      typeMessage: 'Scrivi il tuo messaggio...',
      sendMessage: 'Invia',
      voiceInput: 'Input vocale',
      uploadFile: 'Carica file',
      regenerate: 'Rigenera',
      copy: 'Copia',
      copySuccess: 'Copiato!',
    },
    features: {
      export: 'Esporta',
      share: 'Condividi',
      pin: 'Fissa',
      unpin: 'Rimuovi',
      archive: 'Archivia',
      organize: 'Organizza',
      customize: 'Personalizza',
      analytics: 'Analitiche',
      templates: 'Modelli',
      files: 'File',
    },
  },
  pt: {
    common: {
      back: 'Voltar',
      save: 'Salvar',
      cancel: 'Cancelar',
      delete: 'Excluir',
      edit: 'Editar',
      search: 'Pesquisar',
      loading: 'Carregando...',
      error: 'Erro',
      success: 'Sucesso',
    },
    sidebar: {
      musicStudio: 'Estúdio Musical',
      auraLab: 'AURA A&R',
      codeWorkshop: 'Oficina de Código',
      library: 'Biblioteca',
      memory: 'Memória',
      insights: 'Insights',
      settings: 'Configurações',
      autonomy: 'Autonomia',
      newChat: 'Novo Chat',
      searchConversations: 'Pesquisar conversas...',
    },
    chat: {
      typeMessage: 'Digite sua mensagem...',
      sendMessage: 'Enviar',
      voiceInput: 'Entrada de voz',
      uploadFile: 'Enviar arquivo',
      regenerate: 'Regenerar',
      copy: 'Copiar',
      copySuccess: 'Copiado!',
    },
    features: {
      export: 'Exportar',
      share: 'Compartilhar',
      pin: 'Fixar',
      unpin: 'Desfixar',
      archive: 'Arquivar',
      organize: 'Organizar',
      customize: 'Personalizar',
      analytics: 'Analíticas',
      templates: 'Modelos',
      files: 'Arquivos',
    },
  },
  ja: {
    common: {
      back: '戻る',
      save: '保存',
      cancel: 'キャンセル',
      delete: '削除',
      edit: '編集',
      search: '検索',
      loading: '読み込み中...',
      error: 'エラー',
      success: '成功',
    },
    sidebar: {
      musicStudio: 'ミュージックスタジオ',
      auraLab: 'AURA A&R',
      codeWorkshop: 'コードワークショップ',
      library: 'ライブラリ',
      memory: 'メモリ',
      insights: 'インサイト',
      settings: '設定',
      autonomy: '自律性',
      newChat: '新しいチャット',
      searchConversations: '会話を検索...',
    },
    chat: {
      typeMessage: 'メッセージを入力...',
      sendMessage: '送信',
      voiceInput: '音声入力',
      uploadFile: 'ファイルをアップロード',
      regenerate: '再生成',
      copy: 'コピー',
      copySuccess: 'コピーしました！',
    },
    features: {
      export: 'エクスポート',
      share: '共有',
      pin: 'ピン留め',
      unpin: 'ピン解除',
      archive: 'アーカイブ',
      organize: '整理',
      customize: 'カスタマイズ',
      analytics: '分析',
      templates: 'テンプレート',
      files: 'ファイル',
    },
  },
  ko: {
    common: {
      back: '뒤로',
      save: '저장',
      cancel: '취소',
      delete: '삭제',
      edit: '편집',
      search: '검색',
      loading: '로딩 중...',
      error: '오류',
      success: '성공',
    },
    sidebar: {
      musicStudio: '뮤직 스튜디오',
      auraLab: 'AURA A&R',
      codeWorkshop: '코드 워크샵',
      library: '라이브러리',
      memory: '메모리',
      insights: '인사이트',
      settings: '설정',
      autonomy: '자율성',
      newChat: '새 채팅',
      searchConversations: '대화 검색...',
    },
    chat: {
      typeMessage: '메시지 입력...',
      sendMessage: '전송',
      voiceInput: '음성 입력',
      uploadFile: '파일 업로드',
      regenerate: '재생성',
      copy: '복사',
      copySuccess: '복사됨!',
    },
    features: {
      export: '내보내기',
      share: '공유',
      pin: '고정',
      unpin: '고정 해제',
      archive: '보관',
      organize: '정리',
      customize: '사용자 지정',
      analytics: '분석',
      templates: '템플릿',
      files: '파일',
    },
  },
  zh: {
    common: {
      back: '返回',
      save: '保存',
      cancel: '取消',
      delete: '删除',
      edit: '编辑',
      search: '搜索',
      loading: '加载中...',
      error: '错误',
      success: '成功',
    },
    sidebar: {
      musicStudio: '音乐工作室',
      auraLab: 'AURA A&R',
      codeWorkshop: '代码工作坊',
      library: '图书馆',
      memory: '记忆',
      insights: '洞察',
      settings: '设置',
      autonomy: '自主性',
      newChat: '新对话',
      searchConversations: '搜索对话...',
    },
    chat: {
      typeMessage: '输入消息...',
      sendMessage: '发送',
      voiceInput: '语音输入',
      uploadFile: '上传文件',
      regenerate: '重新生成',
      copy: '复制',
      copySuccess: '已复制！',
    },
    features: {
      export: '导出',
      share: '分享',
      pin: '置顶',
      unpin: '取消置顶',
      archive: '存档',
      organize: '整理',
      customize: '自定义',
      analytics: '分析',
      templates: '模板',
      files: '文件',
    },
  },
  ar: {
    common: {
      back: 'رجوع',
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      search: 'بحث',
      loading: 'جاري التحميل...',
      error: 'خطأ',
      success: 'نجاح',
    },
    sidebar: {
      musicStudio: 'استوديو الموسيقى',
      auraLab: 'AURA A&R',
      codeWorkshop: 'ورشة البرمجة',
      library: 'المكتبة',
      memory: 'الذاكرة',
      insights: 'رؤى',
      settings: 'الإعدادات',
      autonomy: 'الاستقلالية',
      newChat: 'محادثة جديدة',
      searchConversations: 'بحث في المحادثات...',
    },
    chat: {
      typeMessage: 'اكتب رسالتك...',
      sendMessage: 'إرسال',
      voiceInput: 'إدخال صوتي',
      uploadFile: 'رفع ملف',
      regenerate: 'إعادة توليد',
      copy: 'نسخ',
      copySuccess: 'تم النسخ!',
    },
    features: {
      export: 'تصدير',
      share: 'مشاركة',
      pin: 'تثبيت',
      unpin: 'إلغاء التثبيت',
      archive: 'أرشفة',
      organize: 'تنظيم',
      customize: 'تخصيص',
      analytics: 'تحليلات',
      templates: 'قوالب',
      files: 'ملفات',
    },
  },
};

// Language detection
export function detectLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  
  const stored = localStorage.getItem('holly_language');
  if (stored && stored in translations) return stored as Language;
  
  const browserLang = navigator.language.split('-')[0];
  if (browserLang in translations) return browserLang as Language;
  
  return 'en';
}

// Get translations for a language
export function getTranslations(lang: Language): Translations {
  return translations[lang] || translations.en;
}

// Set language
export function setLanguage(lang: Language) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('holly_language', lang);
    window.dispatchEvent(new CustomEvent('languagechange', { detail: lang }));
  }
}

// Hook for React components
export function useTranslations() {
  if (typeof window === 'undefined') return translations.en;
  
  const [lang, setLang] = React.useState<Language>(detectLanguage());
  
  React.useEffect(() => {
    const handleLanguageChange = (e: any) => {
      setLang(e.detail);
    };
    
    window.addEventListener('languagechange', handleLanguageChange);
    return () => window.removeEventListener('languagechange', handleLanguageChange);
  }, []);
  
  return getTranslations(lang);
}

// Import React for the hook
import React from 'react';
