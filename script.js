document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const taskList = document.getElementById("taskList");
  const addTaskBtn = document.getElementById("addTaskBtn");
  const taskModal = document.getElementById("taskModal");
  const taskForm = document.getElementById("taskForm");
  const cancelBtn = document.getElementById("cancelBtn");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const confirmModal = document.getElementById("confirmModal");
  const confirmDeleteBtn = document.getElementById("confirmDelete");
  const cancelDeleteBtn = document.getElementById("cancelDelete");
  const themeToggle = document.getElementById("themeToggle");
  const taskSearch = document.getElementById("taskSearch");
  const taskCounter = document.getElementById("taskCounter");
  const toast = document.getElementById("toast");
  const priorityOptions = document.querySelectorAll(".priority-option");
  const taskPriorityInput = document.getElementById("taskPriority");
  const filterButtons = document.querySelectorAll(".filter-btn");

  // State
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  let currentFilter = "all";
  let taskToDelete = null;
  let lastDeletedTask = null;
  let undoTimeout = null;

  // Initialize
  ensureTaskIds();
  renderTasks();
  applyTheme();
  setupEventListeners();

  // Core Functions
  function ensureTaskIds() {
    let needsUpdate = false;
    tasks.forEach(task => {
      if (!task.id) {
        task.id = Date.now().toString();
        needsUpdate = true;
      }
    });
    if (needsUpdate) saveTasks();
  }

  function setupEventListeners() {
    // Task Modals
    addTaskBtn.addEventListener("click", () => openTaskModal());
    cancelBtn.addEventListener("click", () => closeTaskModal());
    closeModalBtn.addEventListener("click", () => closeTaskModal());

    // Confirmation Modal
    confirmDeleteBtn.addEventListener("click", confirmDelete);
    cancelDeleteBtn.addEventListener("click", () => confirmModal.close());

    // Theme Toggle
    themeToggle.addEventListener("click", toggleTheme);

    // Task Form
    taskForm.addEventListener("submit", handleTaskSubmit);

    // Search
    taskSearch.addEventListener("input", () => renderTasks());

    // Priority Selector
    priorityOptions.forEach((option) => {
      option.addEventListener("click", () => {
        priorityOptions.forEach((opt) => opt.classList.remove("active"));
        option.classList.add("active");
        taskPriorityInput.value = option.dataset.value;
      });
    });

    // Filter Buttons
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        filterButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        currentFilter = button.dataset.filter;
        renderTasks();
      });
    });
  }

  function renderTasks() {
    const searchTerm = taskSearch.value.toLowerCase();

    // Filter tasks
    let filteredTasks = tasks.filter((task) => {
      const matchesFilter =
        currentFilter === "all" ||
        (currentFilter === "completed" && task.completed) ||
        (currentFilter === "pending" && !task.completed);

      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm) ||
        (task.notes && task.notes.toLowerCase().includes(searchTerm));

      return matchesFilter && matchesSearch;
    });

    // Update task counter
    updateTaskCounter(filteredTasks.length);

    if (filteredTasks.length === 0) {
      taskList.innerHTML = `
        <li class="empty-state">
          <i class="fas fa-clipboard-list"></i>
          <p>No tasks found. ${
            searchTerm ? "Try a different search." : "Add your first task!"
          }</p>
        </li>
      `;
      return;
    }

    // Render tasks
    taskList.innerHTML = filteredTasks
      .map(
        (task) => `
      <li class="task-item ${task.completed ? "completed" : ""}" data-id="${
          task.id
        }">
        <div class="task-content">
          <input type="checkbox" class="task-checkbox" ${
            task.completed ? "checked" : ""
          }>
          <div class="task-details">
            <h3 class="task-title">${task.title}</h3>
            <div class="task-meta">
              ${
                task.dueDate
                  ? `
                <span class="task-due">
                  <i class="far fa-calendar-alt"></i>
                  ${formatDueDate(task.dueDate)}
                </span>
              `
                  : ""
              }
              <span class="task-priority priority-${task.priority}">
                ${task.priority}
              </span>
            </div>
            ${task.notes ? `<p class="task-notes">${task.notes}</p>` : ""}
          </div>
        </div>
        <div class="task-actions">
          <button class="icon-btn edit-btn" aria-label="Edit task">
            <i class="fas fa-edit"></i>
          </button>
          <button class="icon-btn delete-btn" aria-label="Delete task">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </li>
    `
      )
      .join("");

    // Add event listeners to tasks
    setupTaskEventListeners();
  }

  function setupTaskEventListeners() {
    // Checkbox toggle
    document.querySelectorAll(".task-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const taskId = e.target.closest(".task-item").dataset.id;
        toggleTaskComplete(taskId);
      });
    });

    // Delete buttons
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const taskId = e.target.closest(".task-item").dataset.id;
        showDeleteConfirmation(taskId);
      });
    });

    // Edit buttons
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const taskId = e.target.closest(".task-item").dataset.id;
        openTaskModal(taskId);
      });
    });

    // Task item click
    document.querySelectorAll(".task-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (
          !e.target.classList.contains("delete-btn") &&
          !e.target.classList.contains("edit-btn") &&
          !e.target.classList.contains("task-checkbox")
        ) {
          const taskId = e.currentTarget.dataset.id;
          openTaskModal(taskId);
        }
      });
    });
  }

  // Task Operations
  function showDeleteConfirmation(taskId) {
    if (tasks.some(task => task.id === taskId)) {
      taskToDelete = taskId;
      confirmModal.showModal();
    } else {
      showToast("Task not found");
    }
  }

  function confirmDelete() {
    if (!taskToDelete) return;
    
    const deletedTask = tasks.find(task => task.id === taskToDelete);
    if (!deletedTask) return;
    
    tasks = tasks.filter(task => task.id !== taskToDelete);
    saveTasks();
    renderTasks();
    
    vibrate();
    showUndoToast("Task deleted", deletedTask);
    
    taskToDelete = null;
    confirmModal.close();
  }

  function showUndoToast(message, task) {
    clearTimeout(undoTimeout);
    lastDeletedTask = task;
    
    const toastElement = document.createElement("div");
    toastElement.className = "undo-toast show";
    toastElement.innerHTML = `
      <span>${message}</span>
      <button id="undoDelete">Undo</button>
    `;
    
    document.querySelectorAll(".undo-toast").forEach(el => el.remove());
    document.body.appendChild(toastElement);
    
    document.getElementById("undoDelete").addEventListener("click", () => {
      undoDelete();
      toastElement.remove();
    });
    
    undoTimeout = setTimeout(() => {
      toastElement.remove();
      lastDeletedTask = null;
    }, 5000);
  }

  function undoDelete() {
    if (lastDeletedTask) {
      tasks.unshift(lastDeletedTask);
      saveTasks();
      renderTasks();
      showToast("Task restored");
      lastDeletedTask = null;
      window.scrollTo(0, 0);
    }
  }

  function toggleTaskComplete(taskId) {
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex !== -1) {
      tasks[taskIndex].completed = !tasks[taskIndex].completed;
      saveTasks();
      renderTasks();
      showToast(
        `Task marked as ${tasks[taskIndex].completed ? "completed" : "pending"}`
      );
    }
  }

  // Modal Functions
  function openTaskModal(taskId = null) {
    if (taskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        document.getElementById("taskTitle").value = task.title;
        document.getElementById("taskDueDate").value = task.dueDate 
          ? new Date(task.dueDate).toISOString().slice(0, 16) 
          : "";
        document.getElementById("taskPriority").value = task.priority;
        document.getElementById("taskNotes").value = task.notes || "";
        document.getElementById("modalTitle").textContent = "Edit Task";
        taskModal.dataset.taskId = taskId;

        priorityOptions.forEach((opt) => opt.classList.remove("active"));
        document
          .querySelector(`.priority-option[data-value="${task.priority}"]`)
          .classList.add("active");
      }
    } else {
      taskForm.reset();
      document.getElementById("modalTitle").textContent = "Add New Task";
      delete taskModal.dataset.taskId;
    }

    taskModal.showModal();
    document.getElementById("taskTitle").focus();
  }

  function closeTaskModal() {
    taskModal.close();
  }

  function handleTaskSubmit(e) {
    e.preventDefault();

    const title = document.getElementById("taskTitle").value.trim();
    const dueDate = document.getElementById("taskDueDate").value;
    const priority = document.getElementById("taskPriority").value;
    const notes = document.getElementById("taskNotes").value.trim();

    if (!title) {
      showToast("Task title is required");
      return;
    }

    const taskData = {
      id: taskModal.dataset.taskId || Date.now().toString(),
      title,
      dueDate: dueDate ? new Date(dueDate).toISOString() : "",
      priority,
      notes,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const existingTaskIndex = tasks.findIndex(
      (t) => t.id === taskModal.dataset.taskId
    );

    if (existingTaskIndex !== -1) {
      taskData.completed = tasks[existingTaskIndex].completed;
      tasks[existingTaskIndex] = taskData;
      showToast("Task updated successfully");
    } else {
      tasks.unshift(taskData);
      showToast("Task added successfully");
    }

    saveTasks();
    closeTaskModal();
    renderTasks();
  }

  // Helper Functions
  function updateTaskCounter(count) {
    taskCounter.textContent = `${count} ${count === 1 ? "task" : "tasks"}`;
  }

  function formatDueDate(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow =
      new Date(date.getTime() - 86400000).toDateString() === now.toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else {
      return (
        date.toLocaleDateString() +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    }
  }

  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  function vibrate() {
    if ("vibrate" in navigator) {
      navigator.vibrate(50);
    }
  }

  // Theme Functions
  function applyTheme() {
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const savedTheme = localStorage.getItem("theme");

    let theme = "light";
    if (savedTheme) {
      theme = savedTheme;
    } else if (systemPrefersDark) {
      theme = "dark";
    }

    document.documentElement.setAttribute("data-theme", theme);
    updateThemeIcon(theme);

    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (!localStorage.getItem("theme")) {
          const newTheme = e.matches ? "dark" : "light";
          document.documentElement.setAttribute("data-theme", newTheme);
          updateThemeIcon(newTheme);
        }
      });
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    let newTheme = currentTheme === "dark" ? "light" : "dark";

    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    if (
      (newTheme === "dark" && systemPrefersDark) ||
      (newTheme === "light" && !systemPrefersDark)
    ) {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", newTheme);
    }

    document.documentElement.setAttribute("data-theme", newTheme);
    updateThemeIcon(newTheme);
  }

  function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector("i");
    icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
  }
});