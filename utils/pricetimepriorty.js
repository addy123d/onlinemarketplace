
function pricetimepriorty(sellOrders){
  sellOrders.sort(pricecompare);

  console.log("After sorting: ");
  console.log(sellOrders);

  return sellOrders[0]; // Probable sell order to match...after price-time comparison !
}


function pricecompare( a, b ) {
    if ( a.base_price < b.base_price ){
      return -1;
    }
    if ( a.base_price > b.base_price ){
      return 1;
    }
    return 0;
}

module.exports = pricetimepriorty;