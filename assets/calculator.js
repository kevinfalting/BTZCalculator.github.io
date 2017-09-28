
// on page load, set up values
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("enlistmentDate").value = moment().format("YYYY-MM-DD");
    document.getElementById("a1cDate").value = moment().format("YYYY-MM-DD");
}, false);

function calculate() {

    // gather all of the important elements on the page
    var enlistmentDate = document.getElementById("enlistmentDate").value;
    var a1cDate = document.getElementById("a1cDate").value;

    var btzBoardDate = document.getElementById("btzBoardDate");
    var sraBTZSewOnDate = document.getElementById("sraBTZSewOnDate");
    var sraSewOnDate = document.getElementById("sraSewOnDate");

    // calculate tis (Time In Service) and tig (Time In Grade for A1C) eligibility dates
    var tis36 = moment(enlistmentDate).add(36, "M");
    var tig20 = moment(a1cDate).add(20, "M");
    var tig28 = moment(a1cDate).add(28, "M");

    if (tis36 >= tig28) {
        sraSewOnDate.innerHTML = tig28.format("MMMM Do, YYYY");
        sraBTZSewOnDate.innerHTML = tig28.subtract(6, "M").format("MMMM Do, YYYY");
        btzBoardDate.innerHTML = calculateBoardDate(tig28);
    } else if (tis36 <= tig20) {
        sraSewOnDate.innerHTML = tig20.format("MMMM Do, YYYY");
        sraBTZSewOnDate.innerHTML = tig20.subtract(6, "M").format("MMMM Do, YYYY");
        btzBoardDate.innerHTML = calculateBoardDate(tig20);
    }

}

// returns the month of the quarter prior to the month they would sew on BTZ
function calculateBoardDate(btzDate) {
    var year = btzDate.year();
    var quarter = btzDate.quarter() - 1; // select the quarter previous to the quarter you would sew on SrA

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