function MonthNavigator({
  selectedMonth,
  setSelectedMonth,
  blockFutureMonths = true,
}) {
  const changeMonth = (offset) => {
    const [year, month] = selectedMonth
      .split("-")
      .map(Number);

    const date = new Date(year, month - 1 + offset, 1);

    const newMonth = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

    setSelectedMonth(newMonth);
  };

  const currentMonth = new Date()
    .toISOString()
    .slice(0, 7);

  const isCurrentMonth =
    selectedMonth === currentMonth;

  return (
    <div className="month-navigation">
      <button
        type="button"
        className="month-arrow"
        onClick={() => changeMonth(-1)}
      >
        ←
      </button>

      <span className="month-label">
        {new Date(
          `${selectedMonth}-01T12:00:00`
        ).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}
      </span>

      <button
        type="button"
        className="month-arrow"
        onClick={() => changeMonth(1)}
        disabled={
          blockFutureMonths &&
          isCurrentMonth
        }
      >
        →
      </button>
    </div>
  );
}

export default MonthNavigator;