document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("reminder-form");
  const tasksList = document.getElementById("tasks-list");
  const clearAllBtn = document.getElementById("clear-all");
  const taskCountSpan = document.getElementById("task-count");
  const toggleFormBtn = document.getElementById("toggle-form");
  const toast = document.getElementById("toast");
  const setReminderCheckbox = document.getElementById("set-reminder");
  const reminderOptionsDiv = document.getElementById("reminder-options");

  setReminderCheckbox.addEventListener("change", function () {
    reminderOptionsDiv.style.display = this.checked ? "block" : "none";
  });

  let tasks = [];

  // Load tasks from storage
  chrome.storage.sync.get(["tasks"], function (result) {
    tasks = result.tasks || [];
    updateTasksList();
    updateTaskCount();
    updateClearAllButtonVisibility();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    addTask();
  });

  clearAllBtn.addEventListener("click", clearAllTasks);

  toggleFormBtn.addEventListener("click", function () {
    form.classList.toggle("hidden");
    toggleFormBtn.innerHTML = form.classList.contains("hidden")
      ? '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>'
      : '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
  });

  function addTask() {
    const task = document.getElementById("task").value;
    const category = document.getElementById("category").value;
    const priority = document.getElementById("priority").value;
    const setReminder = setReminderCheckbox.checked;
    const time = document.getElementById("time").value;

    let newTask = { task, category, priority, time, setReminder };

    if (setReminder) {
      const reminderType = document.querySelector(
        'input[name="reminder-type"]:checked'
      ).value;
      const interval = document.getElementById("interval").value;

      newTask = { ...newTask, reminderType, interval };
    }

    tasks.push(newTask);

    chrome.storage.sync.set({ tasks: tasks }, function () {
      updateTasksList();
      updateTaskCount();
      updateClearAllButtonVisibility();
      form.reset();
      reminderOptionsDiv.style.display = "none";
      setReminderCheckbox.checked = false;
      showToast("Task added successfully!");

      // Send message to background script to set up alarm
      if (setReminder) {
        chrome.runtime.sendMessage({
          action: "setAlarm",
          task: newTask,
        });
      }
    });
  }

  function updateTasksList() {
    tasksList.innerHTML = "";
    tasks.forEach((task, index) => {
      const taskElement = document.createElement("div");
      taskElement.className = "bg-gray-100 p-3 rounded-md shadow-sm";
      taskElement.innerHTML = `
          <h3 class="font-semibold">${task.task}</h3>
          <p class="text-sm text-gray-600">${task.category} - ${
        task.priority
      }</p>
          <p class="text-sm text-gray-600">${new Date(
            task.time
          ).toLocaleString()}</p>
          <button class="delete-task text-red-500 hover:text-red-700" data-index="${index}">Delete</button>
        `;
      tasksList.appendChild(taskElement);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-task").forEach((button) => {
      button.addEventListener("click", function () {
        deleteTask(parseInt(this.getAttribute("data-index")));
      });
    });
  }

  function deleteTask(index) {
    const deletedTask = tasks.splice(index, 1)[0];
    chrome.storage.sync.set({ tasks: tasks }, function () {
      updateTasksList();
      updateTaskCount();
      updateClearAllButtonVisibility();
      showToast("Task deleted successfully!");

      // Send message to background script to clear alarm
      chrome.runtime.sendMessage({
        action: "clearAlarm",
        taskName: deletedTask.task,
      });
    });
  }

  function clearAllTasks() {
    tasks = [];
    chrome.storage.sync.set({ tasks: tasks }, function () {
      updateTasksList();
      updateTaskCount();
      updateClearAllButtonVisibility();
      showToast("All tasks cleared!");

      // Send message to background script to clear all alarms
      chrome.runtime.sendMessage({ action: "clearAllAlarms" });
    });
  }

  function updateTaskCount() {
    taskCountSpan.textContent = `${tasks.length} task${
      tasks.length !== 1 ? "s" : ""
    }`;
  }

  function updateClearAllButtonVisibility() {
    clearAllBtn.style.display = tasks.length > 0 ? "block" : "none";
    if (tasks.length === 0) {
      form.classList.remove("hidden");
    }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove("opacity-0");
    setTimeout(() => {
      toast.classList.add("opacity-0");
    }, 3000);
  }
});
