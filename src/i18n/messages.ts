import type { Lang } from '../types'

// All UI strings live here. Add a key to BOTH `vi` and `en`.
export const MESSAGES = {
  vi: {
    appName: 'PDF Reader',
    tagline: 'Đọc PDF từ Google Drive — highlight, ghi chú, đồng bộ về Drive',

    // Welcome
    welcomeTitle: 'Mở một tệp PDF để bắt đầu',
    openFromDrive: 'Mở từ Google Drive',
    openLocal: 'Mở tệp trên máy',
    signInToUseDrive: 'Đăng nhập Google để dùng Drive',
    notConfigured:
      'Chưa cấu hình Google API. Tạo .env với VITE_GOOGLE_CLIENT_ID và VITE_GOOGLE_API_KEY (xem README).',
    recentFiles: 'Mở gần đây',
    noRecent: 'Chưa có tệp nào.',
    dropHint: 'hoặc kéo–thả tệp PDF vào đây',

    // Auth
    signIn: 'Đăng nhập',
    signOut: 'Đăng xuất',
    signedInAs: 'Đã đăng nhập',

    // Toolbar
    prevPage: 'Trang trước',
    nextPage: 'Trang sau',
    page: 'Trang',
    of: '/',
    zoomIn: 'Phóng to',
    zoomOut: 'Thu nhỏ',
    fitWidth: 'Vừa chiều rộng',
    theme: 'Giao diện',
    themeGroupLight: 'Sáng',
    themeGroupDark: 'Tối',
    themeLight: 'Trắng',
    themeGray: 'Xám nhạt',
    themeSepia: 'Sepia',
    themeSolarizedLight: 'Solarized Light',
    themeDark: 'Tối',
    themeDim: 'Tối dịu',
    themeNight: 'Đêm ấm',
    themeBlack: 'Đen (OLED)',
    themeContrast: 'Tương phản cao',
    themeOneDark: 'One Dark',
    themeDracula: 'Dracula',
    themeNord: 'Nord',
    themeGruvbox: 'Gruvbox',
    themeMonokai: 'Monokai',
    themeSolarizedDark: 'Solarized Dark',
    language: 'Ngôn ngữ',
    toggleOutline: 'Mục lục',
    toggleSearch: 'Tìm kiếm',
    toggleNotes: 'Ghi chú & Highlight',
    toggleBookmarks: 'Trang đã đánh dấu',
    bookmarkThisPage: 'Đánh dấu trang này',
    removeBookmark: 'Bỏ đánh dấu',
    layout: 'Bố cục',
    layoutVertical: 'Cuộn dọc',
    layoutHorizontal: 'Lướt ngang',
    openAnother: 'Mở tệp khác',
    closeDoc: 'Đóng',

    // Selection toolbar
    highlight: 'Tô màu',
    addNote: 'Thêm ghi chú',
    copyText: 'Sao chép',
    copied: 'Đã sao chép',
    removeHighlight: 'Xoá',

    // Search
    searchPlaceholder: 'Tìm trong tài liệu…',
    searching: 'Đang tìm…',
    noResults: 'Không có kết quả',
    resultsCount: (n: number) => `${n} kết quả`,
    onPage: (p: number) => `Trang ${p}`,

    // Outline
    outlineTitle: 'Mục lục',
    noOutline: 'Tài liệu không có mục lục.',

    // Bookmarks panel
    bookmarksTitle: 'Trang đã đánh dấu',
    noBookmarks: 'Chưa đánh dấu trang nào.',
    bookmarkLabelPlaceholder: 'Đặt tên (tùy chọn)…',

    // Notes panel
    notesTitle: 'Ghi chú & Highlight',
    noNotes: 'Chưa có highlight hay ghi chú nào.',
    notePlaceholder: 'Viết ghi chú…',
    save: 'Lưu',
    cancel: 'Huỷ',
    delete: 'Xoá',
    edit: 'Sửa',
    jumpTo: 'Tới vị trí',
    exportNotes: 'Xuất ghi chú',

    // Sync / storage status
    syncSaving: 'Đang lưu về Drive…',
    syncSaved: 'Đã lưu về Drive',
    syncLocal: 'Đã lưu trên máy',
    syncError: 'Lỗi lưu — thử lại',
    syncRetry: 'Thử lại',
    loadingPdf: 'Đang tải PDF…',
    loadingDrive: 'Đang tải từ Drive…',

    // Errors
    errLoadPdf: 'Không mở được tệp PDF.',
    errDrive: 'Lỗi truy cập Google Drive.',
    errAuth: 'Đăng nhập Google thất bại.',
    confirmDelete: 'Xoá highlight này?',
  },

  en: {
    appName: 'PDF Reader',
    tagline: 'Read PDFs from Google Drive — highlight, take notes, synced to Drive',

    welcomeTitle: 'Open a PDF to get started',
    openFromDrive: 'Open from Google Drive',
    openLocal: 'Open local file',
    signInToUseDrive: 'Sign in with Google to use Drive',
    notConfigured:
      'Google API not configured. Create .env with VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY (see README).',
    recentFiles: 'Recent',
    noRecent: 'No files yet.',
    dropHint: 'or drag & drop a PDF here',

    signIn: 'Sign in',
    signOut: 'Sign out',
    signedInAs: 'Signed in',

    prevPage: 'Previous page',
    nextPage: 'Next page',
    page: 'Page',
    of: 'of',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fitWidth: 'Fit width',
    theme: 'Theme',
    themeGroupLight: 'Light',
    themeGroupDark: 'Dark',
    themeLight: 'White',
    themeGray: 'Gray',
    themeSepia: 'Sepia',
    themeSolarizedLight: 'Solarized Light',
    themeDark: 'Dark',
    themeDim: 'Dim',
    themeNight: 'Night (warm)',
    themeBlack: 'Black (OLED)',
    themeContrast: 'High contrast',
    themeOneDark: 'One Dark',
    themeDracula: 'Dracula',
    themeNord: 'Nord',
    themeGruvbox: 'Gruvbox',
    themeMonokai: 'Monokai',
    themeSolarizedDark: 'Solarized Dark',
    language: 'Language',
    toggleOutline: 'Outline',
    toggleSearch: 'Search',
    toggleNotes: 'Notes & Highlights',
    toggleBookmarks: 'Bookmarks',
    bookmarkThisPage: 'Bookmark this page',
    removeBookmark: 'Remove bookmark',
    layout: 'Layout',
    layoutVertical: 'Vertical scroll',
    layoutHorizontal: 'Horizontal',
    openAnother: 'Open another file',
    closeDoc: 'Close',

    highlight: 'Highlight',
    addNote: 'Add note',
    copyText: 'Copy',
    copied: 'Copied',
    removeHighlight: 'Remove',

    searchPlaceholder: 'Search in document…',
    searching: 'Searching…',
    noResults: 'No results',
    resultsCount: (n: number) => `${n} results`,
    onPage: (p: number) => `Page ${p}`,

    outlineTitle: 'Outline',
    noOutline: 'This document has no outline.',

    bookmarksTitle: 'Bookmarks',
    noBookmarks: 'No bookmarks yet.',
    bookmarkLabelPlaceholder: 'Label (optional)…',

    notesTitle: 'Notes & Highlights',
    noNotes: 'No highlights or notes yet.',
    notePlaceholder: 'Write a note…',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    jumpTo: 'Jump to',
    exportNotes: 'Export notes',

    syncSaving: 'Saving to Drive…',
    syncSaved: 'Saved to Drive',
    syncLocal: 'Saved locally',
    syncError: 'Save failed — retry',
    syncRetry: 'Retry',
    loadingPdf: 'Loading PDF…',
    loadingDrive: 'Loading from Drive…',

    errLoadPdf: 'Could not open the PDF.',
    errDrive: 'Google Drive access error.',
    errAuth: 'Google sign-in failed.',
    confirmDelete: 'Delete this highlight?',
  },
} satisfies Record<Lang, Record<string, string | ((...args: never[]) => string)>>

export type Messages = (typeof MESSAGES)['vi']
