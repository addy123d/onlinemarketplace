
function pricetimepriorty(sellOrders){
    sellOrders.sort(compare);
    console.log("After sorting: ");
    console.log(sellOrders);
}


function compare( a, b ) {
    if ( a.base_price < b.base_price ){
      return -1;
    }
    if ( a.base_price > b.base_price ){
      return 1;
    }
    return 0;
}


module.exports = pricetimepriorty;