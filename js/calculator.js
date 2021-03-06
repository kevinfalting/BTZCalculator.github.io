
// on page load, set up values
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("enlistmentDate").value = moment().subtract(1,"y").format("YYYY-MM-DD");
    document.getElementById("a1cDate").value = moment().subtract(1,"y").format("YYYY-MM-DD");
    calculate();
}, false);

function calculate() {

    // reset error
    document.getElementById("error").innerHTML = "";

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

    console.log("\n\n36 mo TIS: "+ tis36.format("MMMM Do, YYYY"));
    console.log("20 mo TIG: "+ tig20.format("MMMM Do, YYYY"));
    console.log("28 mo TIG: "+ tig28.format("MMMM Do, YYYY"));

    // Check for date order
    // Check for invalid date entry format
    // Check if TIG at 28 mo is before TIS at 36 mo
    // Check if TIG at 20 mo is at or before TIS at 36 mo
    // Check if TIG at 20 mo is after TIS at 36 mo
    // Display an error if nothing else works
    if (moment(a1cDate) < moment(enlistmentDate)) {
        document.getElementById("error").innerHTML = "You cannot sew on A1C before your Enlistment Date.";
    } else if(tis36.format("MMMM Do, YYYY") == "Invalid date" || tig20.format("MMMM Do, YYYY") == "Invalid date") {
        document.getElementById("error").innerHTML = "Oops, make sure you typed in the date correctly.\nFormat: mm/dd/yyyy";
    } else if (tig28 <= tis36) {
        sraSewOnDate.innerHTML = tig28.format("MMMM Do, YYYY");
        sraBTZSewOnDate.innerHTML = tig28.subtract(6, "M").format("MMMM Do, YYYY");
        btzBoardDate.innerHTML = calculateBoardDate(tig28);
    } else if (tig20 <= tis36) {
        sraSewOnDate.innerHTML = tis36.format("MMMM Do, YYYY");
        sraBTZSewOnDate.innerHTML = tis36.subtract(6, "M").format("MMMM Do, YYYY");
        btzBoardDate.innerHTML = calculateBoardDate(tis36);
    } else if (tis36 < tig20) {
        sraSewOnDate.innerHTML = tig20.format("MMMM Do, YYYY");
        sraBTZSewOnDate.innerHTML = tig20.subtract(6, "M").format("MMMM Do, YYYY");
        btzBoardDate.innerHTML = calculateBoardDate(tig20);
    } else {
        document.getElementById("error").innerHTML = "Oops! Something went wrong calculating your dates. Please send a screen shot to kevinfalting@gmail.com to have it corrected.";
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