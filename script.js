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

  // Initialize
  renderTasks();
  applyTheme();
  setupEventListeners();

  // Functions
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

    // Filter tasks based on current filter and search term
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

    taskList.innerHTML = filteredTasks
      .map(
        (task, index) => `
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

    // Add event listeners to dynamically created elements
    document.querySelectorAll(".task-checkbox").forEach((checkbox, index) => {
      checkbox.addEventListener("change", () =>
        toggleTaskComplete(filteredTasks[index].id)
      );
    });

    document.querySelectorAll(".delete-btn").forEach((btn, index) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        showDeleteConfirmation(filteredTasks[index].id);
      });
    });

    document.querySelectorAll(".edit-btn").forEach((btn, index) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openTaskModal(filteredTasks[index].id);
      });
    });

    // Add click handler for the entire task item
    document.querySelectorAll(".task-item").forEach((item, index) => {
      item.addEventListener("click", (e) => {
        if (
          !e.target.classList.contains("delete-btn") &&
          !e.target.classList.contains("edit-btn") &&
          !e.target.classList.contains("task-checkbox")
        ) {
          openTaskModal(filteredTasks[index].id);
        }
      });
    });
  }

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

  function openTaskModal(taskId = null) {
    if (taskId) {
      // Editing existing task
      const task = tasks.find((t) => t.id === taskId);
      document.getElementById("taskTitle").value = task.title;
      document.getElementById("taskDueDate").value = task.dueDate || "";
      document.getElementById("taskPriority").value = task.priority;
      document.getElementById("taskNotes").value = task.notes || "";
      document.getElementById("modalTitle").textContent = "Edit Task";

      // Update priority selector UI
      priorityOptions.forEach((opt) => opt.classList.remove("active"));
      document
        .querySelector(`.priority-option[data-value="${task.priority}"]`)
        .classList.add("active");
    } else {
      // Adding new task
      taskForm.reset();
      document.getElementById("modalTitle").textContent = "Add New Task";
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
      id: Date.now().toString(),
      title,
      dueDate,
      priority,
      notes,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    // Check if we're editing an existing task
    const existingTaskIndex = tasks.findIndex(
      (t) => t.id === taskModal.dataset.taskId
    );
    if (existingTaskIndex !== -1) {
      tasks[existingTaskIndex] = { ...tasks[existingTaskIndex], ...taskData };
      showToast("Task updated successfully");
    } else {
      tasks.unshift(taskData);
      showToast("Task added successfully");
    }

    saveTasks();
    closeTaskModal();
    renderTasks();
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

  function showDeleteConfirmation(taskId) {
    taskToDelete = taskId;
    confirmModal.showModal();
  }

  function vibrate() {
  if ('vibrate' in navigator) {
    // Short pulse for success, pattern for warnings
    navigator.vibrate(navigator.vibrate ? 
      [50, 30, 50] : // Pattern for important actions
      50); // Single pulse for regular actions
  }
}

  // Modify the confirmDelete function:
  function confirmDelete() {
    if (taskToDelete) {
      vibrate();
      const deletedTask = tasks.find((t) => t.id === taskToDelete);
      tasks = tasks.filter((task) => task.id !== taskToDelete);
      saveTasks();
      renderTasks();
      showUndoToast("Task deleted", deletedTask); // Updated to use undo toast
      taskToDelete = null;
    }
    confirmModal.close();
  }

  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  // Modify the applyTheme function:
  function applyTheme() {
    // Check for system preference
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

    // Watch for system theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (!localStorage.getItem("theme")) {
          // Only auto-change if no manual preference
          const newTheme = e.matches ? "dark" : "light";
          document.documentElement.setAttribute("data-theme", newTheme);
          updateThemeIcon(newTheme);
        }
      });
  }

  // Update toggleTheme to store null when matching system:
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    let newTheme = currentTheme === "dark" ? "light" : "dark";

    // Check if we're matching system preference
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    if (
      (newTheme === "dark" && systemPrefersDark) ||
      (newTheme === "light" && !systemPrefersDark)
    ) {
      localStorage.removeItem("theme"); // Use system preference
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

  // Replace showToast function and add:
  let undoTimeout;
  let lastDeletedTask = null;

  function showUndoToast(message, task) {
    clearTimeout(undoTimeout);
    lastDeletedTask = task;

    const toast = document.createElement("div");
    toast.className = "undo-toast show";
    toast.innerHTML = `
    <span>${message}</span>
    <button id="undoDelete">Undo</button>
  `;

    // Remove any existing toasts
    document.querySelectorAll(".undo-toast").forEach((el) => el.remove());
    document.body.appendChild(toast);

    // Set up undo button
    document.getElementById("undoDelete").addEventListener("click", () => {
      undoDelete();
      toast.remove();
    });

    // Auto-dismiss after 5 seconds
    undoTimeout = setTimeout(() => {
      toast.remove();
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
      // Add to undoDelete function:
      scrollTo(0, 0); // Scroll to top where restored task appears
    }
  }
});
