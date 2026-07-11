// Import React's useState feature.
// useState allows React to remember and update data on the page.
import { useState } from "react";

// App is the main component for the FOH Goal Tracker.
function App() {
  // formData stores the report currently being filled out.
  const [formData, setFormData] = useState({
    date: "",
    sales: "",
    fohHours: "",
    bohHours: "",
    carCount: "",
    cem: "",
    cares: "",
  });

  // entries stores the list of completed reports.
  // When the app first loads, this checks localStorage first.
  const [entries, setEntries] = useState(() => {
    // Get saved report data from the browser's filing cabinet.
    const savedEntries = localStorage.getItem("fohEntries");

    // If saved data exists, convert it from JSON text back into an array.
    if (savedEntries) {
      return JSON.parse(savedEntries);
    }

    // If nothing was saved yet, start with an empty list.
    return [];
  });

  // Runs every time the user types into a field.
  function handleChange(event) {
    // Get the field name and the typed value from the input.
    const { name, value } = event.target;

    // Update only the field that changed.
    setFormData({
      ...formData,
      [name]: value,
    });
  }

  // Runs when the user clicks the Save button.
  function handleSubmit(event) {
    // Stop the browser from refreshing the page.
    event.preventDefault();

    // Create a new list containing old reports plus the current report.
    const updatedEntries = [...entries, formData];

    // Tell React to display the new list of reports.
    setEntries(updatedEntries);

    // Save the updated list in localStorage as JSON text.
    localStorage.setItem("fohEntries", JSON.stringify(updatedEntries));

    // Show the saved list in the console for testing.
    console.log("Saved entries:", updatedEntries);

    // Tell the user the save worked.
    alert("Entry saved.");
  }

  // Runs when the user wants to delete a saved report.
function handleDelete(indexToDelete) {
  // Create a new list that keeps every entry EXCEPT the one clicked.
  // Ask the user to confirm before deleting the report.
  const confirmed = window.confirm("Delete this entry?");

  // Stop the function if the user chooses Cancel.
  if (!confirmed) {
    return;
  }

  const updatedEntries = entries.filter((entry, index) => {
    return index !== indexToDelete;
  });

  // Tell React to display the updated list.
  setEntries(updatedEntries);

  // Save the updated list to localStorage.
  localStorage.setItem("fohEntries", JSON.stringify(updatedEntries));
}

  // Everything inside return is what appears on the page.
  return (
    <div>
      <h1>FOH Goal Tracker</h1>

      <form onSubmit={handleSubmit}>
        {/* Date Field */}
        <div>
          <label>Date: </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
          />
        </div>

        {/* Sales Field */}
        <div>
          <label>Sales: </label>
          <input
            type="number"
            name="sales"
            value={formData.sales}
            onChange={handleChange}
          />
        </div>

        {/* FOH Hours Field */}
        <div>
          <label>FOH Hours: </label>
          <input
            type="number"
            name="fohHours"
            value={formData.fohHours}
            onChange={handleChange}
          />
        </div>

        {/* BOH Hours Field */}
        <div>
          <label>BOH Hours: </label>
          <input
            type="number"
            name="bohHours"
            value={formData.bohHours}
            onChange={handleChange}
          />
        </div>

        {/* Car Count Field */}
        <div>
          <label>Car Count: </label>
          <input
            type="number"
            name="carCount"
            value={formData.carCount}
            onChange={handleChange}
          />
        </div>

        {/* CEM Field */}
        <div>
          <label>CEM: </label>
          <input
            type="number"
            name="cem"
            value={formData.cem}
            onChange={handleChange}
          />
        </div>

        {/* CARES Field */}
        <div>
          <label>CARES: </label>
          <input
            type="number"
            name="cares"
            value={formData.cares}
            onChange={handleChange}
          />
        </div>

        <button type="submit">Save</button>
      </form>

      <h2>Saved Entries</h2>

      {/* Display each saved report. */}
      {entries.map((entry, index) => (
        <div key={index}>
          <p>
            {entry.date} — Sales: ${entry.sales} | FOH: {entry.fohHours} | BOH:{" "}
            {entry.bohHours} | Cars: {entry.carCount}
          </p>
          
          <button onClick={() => handleDelete(index)}>
            Delete
            </button>
        </div>
      ))}
    </div>
  );
}

// Export App so main.jsx can load it.
export default App;