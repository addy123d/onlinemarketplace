
function pricetimepriorty(Orders){
  if(Orders.type === "sell"){
    Orders.sort(pricecompare);
  }else{
    Orders.sort(pricecompare_1);
  }


  console.log("After sorting: ");
  console.log(Orders);

  return Orders[0]; // Probable sell order to match...after price-time comparison !
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

function pricecompare_1( a, b ) {
    if ( a.base_price > b.base_price ){
      return -1;
    }
    if ( a.base_price < b.base_price ){
      return 1;
    }
    return 0;
}

module.exports = pricetimepriorty;