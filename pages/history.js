let currentPage = 1;
let rowsPerPage = 5;
let totalPages = 1;
let data = [];
let currentSort = {
    column: 'timestamp',
    direction: 'desc'
};

function setupSortListeners() {
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', function() {
            const column = this.dataset.sort;
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }
            
            // Update sort icons
            document.querySelectorAll('.sort-icon').forEach(icon => {
                icon.className = 'fas fa-sort sort-icon';
            });
            const icon = this.querySelector('.sort-icon');
            icon.className = `fas fa-sort-${currentSort.direction === 'asc' ? 'up' : 'down'} sort-icon`;
            
            currentPage = 1;
            fetchHistory();
        });
    });
}

async function fetchHistory() {
    try {
        const searchQuery = document.getElementById('searchInput').value.toLowerCase();
        const filterType = document.getElementById('filterSelect').value;
        
        const queryParams = new URLSearchParams({
            page: currentPage,
            limit: rowsPerPage,
            filterType: filterType,
            searchQuery: searchQuery,
            sortColumn: currentSort.column,
            sortDirection: currentSort.direction
        });

        const response = await fetch(`http://localhost:5001/api/history?${queryParams}`);
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.status);
        }
        
        const result = await response.json();
        data = result.data;
        totalPages = result.pagination.totalPages;
        renderTable();
    } catch (error) {
        console.error('Lỗi:', error);
        const tableBody = document.getElementById('userTableBody');
        tableBody.innerHTML = '<tr><td colspan="4">Có lỗi xảy ra khi tải dữ liệu: ' + error.message + '</td></tr>';
    }
}

function renderTable() {
    const tableBody = document.getElementById('userTableBody');
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4">Không có dữ liệu để hiển thị</td></tr>';
    } else {
        data.forEach(item => {
            const row = `
                <tr>
                    <td>${item.id || 'N/A'}</td>
                    <td>${item.device_name || 'N/A'}</td>
                    <td>${item.action || 'N/A'}</td>
                    <td>${new Date(item.timestamp).toLocaleString() || 'N/A'}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }

    updatePagination();
}

function updatePagination() {
    const pagination = document.getElementById('pagination');
    const maxPagesToShow = 5;

    pagination.innerHTML = '';

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
    const prevA = document.createElement('a');
    prevA.className = 'page-link';
    prevA.href = '#';
    prevA.textContent = 'Previous';
    prevA.addEventListener('click', function(e) {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            fetchHistory();
        }
    });
    prevLi.appendChild(prevA);
    pagination.appendChild(prevLi);

    // Page numbers
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = 'page-item' + (i === currentPage ? ' active' : '');
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = i;
        a.addEventListener('click', function(e) {
            e.preventDefault();
            currentPage = i;
            fetchHistory();
        });
        li.appendChild(a);
        pagination.appendChild(li);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
    const nextA = document.createElement('a');
    nextA.className = 'page-link';
    nextA.href = '#';
    nextA.textContent = 'Next';
    nextA.addEventListener('click', function(e) {
        e.preventDefault();
        if (currentPage < totalPages) {
            currentPage++;
            fetchHistory();
        }
    });
    nextLi.appendChild(nextA);
    pagination.appendChild(nextLi);
}

function filterTable() {
    currentPage = 1;
    fetchHistory();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    rowsPerPage = parseInt(document.getElementById('rowsPerPage').value);
    setupSortListeners();
    fetchHistory();
});

document.getElementById('rowsPerPage').addEventListener('change', function() {
    rowsPerPage = parseInt(this.value);
    currentPage = 1;
    fetchHistory();
});

// Thêm event listener cho search input
document.getElementById('searchInput').addEventListener('input', function() {
    currentPage = 1;
    fetchHistory();
});

// Thêm event listener cho filter select
document.getElementById('filterSelect').addEventListener('change', function() {
    currentPage = 1;
    fetchHistory();
});