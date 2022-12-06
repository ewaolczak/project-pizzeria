import { templates } from '../settings.js';

class HomePage {
  constructor(element) {
    const thisHomePage = this;

    thisHomePage.render(element);
  }

  render(element) {
    const thisHomePage = this;

    thisHomePage.dom = {};
    thisHomePage.dom.wrapper = element;

    const generatedHTML = templates.homePage();
    thisHomePage.dom.wrapper.innerHTML = generatedHTML;

    setTimeout(thisHomePage.initCarousel, 500);
  }

  initCarousel() {
    const elem = document.querySelector('.main-carousel');

    const flkty = new Flickity(elem, {
      cellAlign: 'left',
      contain: true
    });
    console.log(flkty);
  }
}

export default HomePage;
