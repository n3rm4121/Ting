function createAlarm(task) {
  console.log(task);
  const alarmInfo = {
    when: new Date(task.time).getTime(),
  };

  if (task.reminderType === "daily") {
    alarmInfo.periodInMinutes = 24 * 60; // 24 hours in minutes
  } else if (task.reminderType === "interval") {
    alarmInfo.periodInMinutes = parseInt(task.interval);
  }
  // for non-repetitive tasks, we don't set a periodInMinutes
  chrome.alarms.create(task.task, alarmInfo);
}

// listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "setAlarm") {
    createAlarm(request.task);
  } else if (request.action === "clearAlarm") {
    chrome.alarms.clear(request.taskName);
  } else if (request.action === "clearAllAlarms") {
    chrome.alarms.clearAll();
  }
});

// listen for alarms
// chrome.alarms.onAlarm.addListener(function (alarm) {
//   chrome.storage.sync.get(["tasks"], function (result) {
//     const tasks = result.tasks || [];
//     const task = tasks.find((t) => t.task === alarm.name);
//     if (task) {
//       chrome.notifications.create("", {
//         type: "basic",
//         iconUrl: "icon.png",
//         title: "Task Reminder",
//         message: `${task.task} (${task.category} - ${task.priority})`,
//       });

//       // If it's not a recurring task, remove it from the list
//       //   if (!task.reminderType) {
//       //     const updatedTasks = tasks.filter((t) => t.task !== alarm.name);
//       //     chrome.storage.sync.set({ tasks: updatedTasks });
//       //     // Clear the alarm for non-repetitive tasks
//       //     chrome.alarms.clear(alarm.name);
//       //   }
//     }
//   });
// });

function checkReminders() {
  //   console.log("Checking reminders");
  chrome.storage.sync.get(["tasks"], function (result) {
    const tasks = result.tasks || [];
    const currentTime = new Date();
    const updatedTasks = tasks.map((task) => {
      if (new Date(task.time) <= currentTime) {
        // create a notification
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon.png",
          title: `Task Reminder: ${task.category}`,
          message: `It's time to: ${task.task} (Priority: ${task.priority})`,
        });

        // update the time for recurring tasks
        if (task.reminderType === "daily") {
          const nextDay = new Date(task.time);
          nextDay.setDate(nextDay.getDate() + 1);
          task.time = nextDay.toISOString();
        } else if (task.reminderType === "interval") {
          const nextTime = new Date(task.time);
          nextTime.setMinutes(nextTime.getMinutes() + parseInt(task.interval));
          task.time = nextTime.toISOString();
        } else {
          // if it's a one-time reminder, mark it for removal
          task.completed = true;
        }
      }
      return task;
    });

    // remove completed one-time tasks
    const filteredTasks = updatedTasks.filter((task) => !task.completed);

    // update storage with modified tasks
    chrome.storage.sync.set({ tasks: filteredTasks });
  });
}

// setInterval(checkReminders, 60000);
setInterval(checkReminders, 1000); // check every second

// also check when the extension is first loaded
checkReminders();

// to set up alarms for existing tasks when the extension starts
function setupExistingAlarms() {
  chrome.storage.sync.get(["tasks"], function (result) {
    const tasks = result.tasks || [];
    tasks.forEach((task) => {
      if (task.setReminder) {
        createAlarm(task);
      }
    });
  });
}

setupExistingAlarms();
