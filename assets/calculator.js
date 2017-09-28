
// on page load, set up values
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("enlistmentDate").value = moment().format("YYYY-MM-DD");
    document.getElementById("a1cDate").value = moment().format("YYYY-MM-DD");
}, false);

function calculate() {

    // gather all of the important elements on the page
    const years = document.getElementById("years").value;
    const enlistmentDate = document.getElementById("enlistmentDate").value;
    const a1cDate = document.getElementById("a1cDate").value;

    var btzBoardDate = document.getElementById("btzBoardDate");
    var sraBTZSewOnDate = document.getElementById("sraBTZSewOnDate");
    var sraSewOnDate = document.getElementById("sraSewOnDate");

    if (years == 6) {
        btzBoardDate.innerHTML = calculateBoardDate(moment(a1cDate));
        sraBTZSewOnDate.innerHTML = moment(a1cDate).add(22, "M").format("MMMM Do, YYYY");
        sraSewOnDate.innerHTML = moment(a1cDate).add(28, "M").format("MMMM Do, YYYY");
    }
}

// returns the month of the quarter prior to the month they would sew on BTZ
function calculateBoardDate(a1cDate) {
    a1cDate = a1cDate.add(22, "M");
    var quarter = a1cDate.quarter() - 1;
    var year = a1cDate.year();

    switch (quarter) {
        case 0:
            return moment().year(year - 1).month(11).format("MMMM YYYY"); break;
        case 1:
            return moment().year(year).month(2).format("MMMM YYYY"); break;
        case 2:
            return moment().year(year).month(5).format("MMMM YYYY"); break;
        case 3:
            return moment().year(year).month(8).format("MMMM YYYY"); break;
        default:
            console.error("Something went wrong when it calculated the quarter.");
    }
}