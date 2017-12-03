#!/usr/bin/python3
# -*- coding: utf-8 -*-

'''Fixtures for Selenium end-to-end tests.'''

import contextlib
import json
import os.path
import pytest
import re
import sys
import time
import urllib

from selenium import webdriver
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.support.wait import WebDriverWait


_DEFAULT_TIMEOUT = 3  # seconds
_CI = os.environ.get('CONTINUOUS_INTEGRATION') == 'true'
_DIRNAME = os.path.dirname(__file__)
_ROOT = os.path.abspath(os.path.join(_DIRNAME, '..'))
_SUCCESS = True
_WINDOW_SIZE = (1920, 1080)


class Driver(object):
    '''Wraps the state needed to run a test.'''

    def __init__(self, browser, wait, url):
        self.browser = browser
        self.wait = wait
        self._url = url
        self.id = str(int(time.time()))

    def url(self, path):
        '''Gets the full url for :path.'''

        return urllib.parse.urljoin(self._url, path)

    def eval_script(self, script):
        '''Returns the evaluation of the JavaScript expression |script|'''

        return self.browser.execute_script('return (%s);' % script)

    def assert_script(self, script):
        '''Asserts that evaluating the JavaScript |script| returns true.'''

        assert self.browser.execute_script('return !!(%s);' % script), \
            'Evaluation of `%s` returned false' % script

    def assert_script_equal(self, script, value):
        '''Asserts that evaluating the JavaScript |script| returns true.'''

        assert self.eval_script(script) == value, script

    @contextlib.contextmanager
    def ajax_page_transition(self):
        '''Waits for an AJAX-initiated page transition to finish.'''

        prev_url = self.browser.current_url
        yield
        self.wait.until(lambda _: self.browser.current_url != prev_url)
        self.wait_for_page_loaded()

    def wait_for_page_loaded(self):
        '''Waits for the page to be loaded.'''

        self.wait.until(
            lambda _: self.browser.execute_script(
                'return document.readyState;') == 'complete')


@pytest.hookimpl(hookwrapper=True)
def pytest_pyfunc_call(pyfuncitem):
    '''Takes a screenshot and grabs console logs on test failures.'''

    global _SUCCESS

    outcome = yield

    if not outcome.excinfo:
        return
    _SUCCESS = False
    if 'driver' not in pyfuncitem.funcargs:
        return
    try:
        driver = pyfuncitem.funcargs['driver']
        try:
            logs = driver.browser.get_log('browser')
        except:
            # geckodriver does not support getting logs:
            # https://github.com/mozilla/geckodriver/issues/284
            logs = []
        if _CI:
            print(logs, self.driver.get_screenshot_as_base64(), file=sys.stderr)
            return
        results_dir = os.path.join(_DIRNAME, 'results')
        os.makedirs(results_dir, exist_ok=True)
        driver.browser.get_screenshot_as_file(
            os.path.join(results_dir, 'webdriver_%s.png' % pyfuncitem.name))
        with open(os.path.join(results_dir, 'webdriver_%s.log' % pyfuncitem.name), 'w') as f:
            json.dump(logs, f, indent=2)
    except Exception as ex:
        print(ex)


def pytest_addoption(parser):
    '''Allow configuration of test invocation.'''

    parser.addoption('--browser', action='append', type=str, dest='browsers',
                     help='The browsers that the test will run against')
    parser.addoption('--disable-headless', action='store_false',
                     dest='headless', help='Show the browser window')


def pytest_generate_tests(metafunc):
    '''Parameterize the tests with the browsers.'''

    if not metafunc.config.option.browsers:
        metafunc.config.option.browsers = ['chrome', 'firefox']

    if 'driver' in metafunc.fixturenames:
        metafunc.parametrize('browser', metafunc.config.option.browsers,
                             scope='session')


@pytest.yield_fixture(scope='session')
def driver(request, browser):
    '''Run tests using the selenium webdriver.'''

    if browser == 'chrome':
        options = webdriver.ChromeOptions()
        options.binary_location = '/usr/bin/google-chrome'
        options.add_experimental_option('prefs', {'intl.accept_languages': 'en_US'})
        options.add_argument('--lang=en-US')
        if request.config.option.headless:
            options.add_argument('--headless')
        browser = webdriver.Chrome(chrome_options=options)
    else:
        firefox_capabilities = webdriver.common.desired_capabilities.DesiredCapabilities.FIREFOX
        firefox_capabilities['marionette'] = True
        options = webdriver.firefox.options.Options()
        if request.config.option.headless:
            options.add_argument('-headless')
        browser = webdriver.Firefox(capabilities=firefox_capabilities,
                                    firefox_options=options)
    browser.set_window_size(*_WINDOW_SIZE)

    browser.implicitly_wait(_DEFAULT_TIMEOUT)
    wait = WebDriverWait(browser, _DEFAULT_TIMEOUT,
                         poll_frequency=0.1)

    try:
        yield Driver(browser, wait, 'file://%s/' % _ROOT)
    finally:
        browser.quit()
