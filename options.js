let editIndex = -1;
const urlList = document.getElementById('urlList');

document.addEventListener('DOMContentLoaded', initialize);
document.getElementById('addBtn').addEventListener('click', addUrl);
document.getElementById('masterToggle').addEventListener('change', toggleMaster);
document.getElementById('exportBtn').addEventListener('click', exportData);
document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', importData);

function initialize() {
    chrome.storage.sync.get(['userUrls', 'isEnabled'], (res) => {
        document.getElementById('masterToggle').checked = res.isEnabled !== false;
        loadUrls(res.userUrls || []);
    });
}

function processInputAsUrl(text) {
    const urlPattern = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(:\d{1,5})?(\/.*)?$/i;
    return urlPattern.test(text) ? (text.startsWith('http') ? text : 'https://' + text) : 'https://www.google.com/search?q=' + encodeURIComponent(text);
}

function loadUrls(urls) {
    urlList.innerHTML = '';
    urls.forEach((item, index) => {
        const li = document.createElement('li');
        li.draggable = true;
        li.dataset.index = index;
        
        li.innerHTML = `
            <span class="drag-handle">☰</span>
            <a href="${processInputAsUrl(item)}" class="url-text" target="_blank">${item}</a>
            <div class="actions">
                <button class="action-btn copy-btn">نسخ</button>
                <button class="action-btn edit-btn">تعديل</button>
                <button class="action-btn delete-btn">حذف</button>
            </div>
        `;
        
        li.querySelector('.copy-btn').addEventListener('click', () => copyUrl(item));
        li.querySelector('.edit-btn').addEventListener('click', () => editUrl(index, item));
        li.querySelector('.delete-btn').addEventListener('click', () => removeUrl(index));

        setupDragEvents(li);
        urlList.appendChild(li);
    });
}

function addUrl() {
    const input = document.getElementById('urlInput');
    const val = input.value.trim();
    if (!val) return;

    chrome.storage.sync.get(['userUrls'], (res) => {
        let urls = res.userUrls || [];
        const existingIndex = urls.indexOf(val);

        if (editIndex > -1) {
            if (existingIndex !== -1 && existingIndex !== editIndex) {
                alert("هذا الرابط موجود بالفعل في القائمة.");
                return;
            }
            urls[editIndex] = val;
            editIndex = -1;
            document.getElementById('addBtn').textContent = 'إضافة';
            document.getElementById('addBtn').classList.remove('edit-mode');
        } else {
            if (existingIndex !== -1) {
                alert("هذا الرابط موجود بالفعل في القائمة.");
                return;
            }
            urls.push(val);
        }

        chrome.storage.sync.set({ userUrls: urls }, () => {
            input.value = '';
            loadUrls(urls);
        });
    });
}

function removeUrl(index) {
    if (!confirm("حذف الرابط؟")) return;
    chrome.storage.sync.get(['userUrls'], (res) => {
        let urls = res.userUrls || [];
        urls.splice(index, 1);
        chrome.storage.sync.set({ userUrls: urls }, () => loadUrls(urls));
    });
}

function editUrl(index, text) {
    document.getElementById('urlInput').value = text;
    editIndex = index;
    const btn = document.getElementById('addBtn');
    btn.textContent = 'حفظ';
    btn.classList.add('edit-mode');
}

function toggleMaster(e) {
    chrome.storage.sync.set({ isEnabled: e.target.checked });
}

function exportData() {
    chrome.storage.sync.get(['userUrls'], (res) => {
        const blob = new Blob([JSON.stringify(res.userUrls || [])], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; 
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); 
        
        a.download = `daily-tabs-backup_${dateStr}_${timeStr}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    });
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedUrls = JSON.parse(event.target.result);
            chrome.storage.sync.get(['userUrls'], (res) => {
                const currentUrls = res.userUrls || [];
                const combinedUrls = [...new Set([...currentUrls, ...importedUrls])];
                
                chrome.storage.sync.set({ userUrls: combinedUrls }, () => {
                    loadUrls(combinedUrls);
                    alert("تم استيراد الروابط الجديدة ودمجها بنجاح!");
                });
            });
        } catch (err) { 
            alert("فشل الاستيراد: الملف غير صالح."); 
        }
        e.target.value = '';
    };
    reader.readAsText(file);
}

function copyUrl(t) { navigator.clipboard.writeText(t); }

function setupDragEvents(li) {
    li.addEventListener('dragstart', () => li.classList.add('dragging'));
    li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        const newUrls = Array.from(urlList.querySelectorAll('.url-text')).map(a => a.textContent);
        chrome.storage.sync.set({ userUrls: newUrls });
    });
    urlList.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(urlList, e.clientY);
        const dragging = document.querySelector('.dragging');
        if (afterElement == null) urlList.appendChild(dragging);
        else urlList.insertBefore(dragging, afterElement);
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
        else return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}