import { Cart, addToCart } from "../data/cart.js";


export function getProduct(productId) {
   let matchingProduct;

 products.forEach((product) => {
   if (product.id === productId) {
      matchingProduct = product;
   }
 });
 return matchingProduct;
}

export const products = [{
  id: 'rhrhur784754u-jkvh674784-kghg7t4y-4784764g',
  image: 'amazon-images/blackout-curtains-black.jpg',
  name: 'Blackout Curtains Set 42 x 84-Inch - Black,',
  rating: {
    stars: 4.5,
    count:363
  },
  pricecents: 3099

}, {
  id: 'uifg46764-hr46464g-jfg4rt764r-hfgytr4t7r4',
  image: 'amazon-images/countertop-blender-64-oz.jpg',
  name: 'Countertop Blender 64oz, 1400 Watts',
  rating: {
    stars: 4.5,
    count: 3
  }, 
  pricecents: 1047

}, {
  id: 'kerhjruy44-fh346754gh4-frrhu4y764yurf-4ry4ry4gr',
  image: 'amazon-images/men-cozy-fleece-zip-up-hoodie-red.jpg',
  name: "Men's Full-Zip Hooded Sweatshirt",
  rating:{
    stars: 4.5,
    count: 3157
  }, 
  pricecents: 2400

  }, {
    id: 'urfghrf6767-jhfhr4764-jrfhr87478-jfwghr367',
   image: 'amazon-images/luxury-tower-set-6-piece.jpg',
   name: 'Luxury Towel Set - Graphite Gray pairs',
   rating: {
    stars: 4.5,
    count: 144
   },
   pricecents: 3599 

  }, {
    id: 'efgdgr4674y-fhur476-bhdght7648-jhfrh4r7624',
    image: 'amazon-images/straw-sunhat.webp',
    name: 'Straw Lifeguard Sun Hat Fabrical -',
    rating: {
      stars: 4.5,
      count: 215
    },
    pricecents: 2200

  }, {
    id: 'yteftf78-fh3877hr-rjhut4765u-jvhjeugr4764',
    image: 'amazon-images/round-sunglasses-black (1).jpg',
    name: "Women's Chiffon Beachwear Cover Up -",
    rating: {
      stars: 4.5,
      count: 235
    },
    pricecents: 2070

  }, {
    id: '7t476yghrfh-fvhjfgr7r4-rfjry467-fvhjrgr4ty',
    image: 'amazon-images/6-piece-non-stick-baking-set (1).webp',
    name: '6-Piece Nonstick, Carbon Steel Oven items',
    rating: {
      stars: 4.5,
      count: 175
    },
    pricecents: 3499

  }, {
    id: 'hrfghgr4764r-hjey74ry74rb-brgrf74-r4hjr467674r',
    image: 'amazon-images/6-piece-white-dinner-plate-set.jpg',
    name: '6 Piece White Dinner Plate Set of items',
    rating: {
      stars: 4.5,
      count: 37
    },
    pricecents: 2067

  }, {
    id: 'hrghreyr4yr-rhr78474gh4-rfjyfr67r4ghrf-hjryufr674yu',
    image: 'amazon-images/intermediate-composite-basketball.jpg',
    name: 'Intermediate Size Basketball in pairs',
    rating: {
      stars: 4.5,
      count: 127
    },
    pricecents: 2095

  }, {
    id: 'kjher674-67464gyhg-rfjrftyr467r-hjfrytf674r',
    image: 'amazon-images/adults-plain-cotton-tshirt-2-pack-teal.jpg',
    name: 'Adults Plain Cotton T-Shirt - 2 Pack',
    rating: {
      stars: 4.5,
      count: 56
    },
    pricecents: 799

  }, {
    id: 'jkruhr86r4yr4-fjhrf76r47r4h-nfrgtfr64yr-jfyr67r4',
    image: 'amazon-images/athletic-cotton-socks-6-pairs (1).jpg',
    name: 'Black and Gray Athletic Cotton Socks - 6 Pairs',
    rating: {
      stars: 4.5,
      count: 87
    },
    pricecents: 1090

  }, {
    id: 'jkeur67ry8r4-fjrhu467-crbt464j3-ehuey76r4563',
    image: 'amazon-images/black-2-slot-toaster.jpg',
    name: '2 Slot Toaster - Black Orders available in pairs ',
    rating: {
      stars: 4.5,
      count: 2187
    },
   pricecents: 1899
  } , {
  id: 'uifg46764-hr46464g-jfg4rt764r-hfgytr4t7r4',
  image: 'amazon-images/countertop-blender-64-oz.jpg',
  name: 'Countertop Blender 64oz, 1400 Watts',
  rating: {
    stars: 4.5,
    count: 3
  }, 
  pricecents: 1047

}, {
  id: 'kerhjruy44-fh346754gh4-frrhu4y764yurf-4ry4ry4gr',
  image: 'amazon-images/men-cozy-fleece-zip-up-hoodie-red.jpg',
  name: "Men's Full-Zip Hooded Fleece Sweatshirt",
  rating:{
    stars: 4.5,
    count: 3157
  }, 
  pricecents: 2400

  }, {
    id: 'urfghrf6767-jhfhr4764-jrfhr87478-jfwghr367',
   image: 'amazon-images/luxury-tower-set-6-piece.jpg',
   name: 'Luxury Towel Set - Graphite Gray pairs',
   rating: {
    stars: 4.5,
    count: 144
   },
   pricecents: 3599 

  }, {
    id: 'efgdgr4674y-fhur476-bhdght7648-jhfrh4r7624',
    image: 'amazon-images/straw-sunhat.webp',
    name: 'Straw Lifeguard Sun Hat Fabrical -',
    rating: {
      stars: 4.5,
      count: 215
    },
    pricecents: 2200

  }];


  let productsHTML = '';

  products.forEach((product) => {
   productsHTML += ` 
       <div class="div-div">
    <div class="paragraph-div">
    <img class="images-order" src="${product.image}">

     <p class="order-name">
      ${product.name}
    </p>

    <span class="star-icon">&#9733&#9733&#9733&#9733&#9734 <span class="count-c">${product.rating.count}</span>
    </span>
    
    <p class="price-cents"> $${(product.pricecents / 100).toFixed(2)}</p>
    <a class="num" href="" >08127689541</a>

     <button class="add-button js-add-to-cart" data-product-id="${product.id}"> Add to Cart </button>
    </div>
    </div>
  `;
  });

 
    try {
    document.querySelector('.js-products-grid').innerHTML = productsHTML;
   }catch(error) {
    // console.log('error. try again later')
  }


    function updateCartQuantity () {
      let cartQuantity = 0; 

       Cart.forEach((cartItem) => {
          cartQuantity  += cartItem.quantity
       })

       document.querySelector('.js-cart-quantity').innerHTML = cartQuantity;
    };


  document.querySelectorAll('.js-add-to-cart')
   .forEach((button) => {
      button.addEventListener('click', () => {
       const productId = button.dataset.productId;

       addToCart(productId)  
       updateCartQuantity();
       
      });
   });

   