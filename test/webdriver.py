#!/usr/bin/python3
# -*- coding: utf-8 -*-

'''Run Selenium end-to-end tests.'''

import os.path
import re
import sys
import unittest

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.wait import WebDriverWait

_DEFAULT_TIMEOUT = 5  # seconds
_ROOT = os.path.abspath(os.path.join(__file__, '..', '..'))
_EMPTY_WORLD = '''
<ejecucion>
  <condiciones instruccionesMaximasAEjecutar="10000000" longitudStack="65000"></condiciones>
  <mundos>
    <mundo nombre="mundo_0" ancho="100" alto="100">
    </mundo>
  </mundos>
  <programas tipoEjecucion="CONTINUA" intruccionesCambioContexto="1" milisegundosParaPasoAutomatico="0">
    <programa nombre="p1" ruta="{$2$}" mundoDeEjecucion="mundo_0" xKarel="1" yKarel="1" direccionKarel="NORTE" mochilaKarel="0"></programa>
  </programas>
</ejecucion>'''  # noqa


class SmokeTest(unittest.TestCase):
    '''End-to-end tests.'''

    def setUp(self):
        self.driver = webdriver.Firefox()
        self.driver.implicitly_wait(_DEFAULT_TIMEOUT)
        self.wait = WebDriverWait(self.driver, _DEFAULT_TIMEOUT,
                                  poll_frequency=0.1)
        self.driver.get('file://%s' % os.path.join(_ROOT, 'index.html'))

    def test_smoke(self):
        '''Tests basic functionality.'''

        driver = self.driver

        self.init(_EMPTY_WORLD, '''iniciar-programa
    inicia-ejecucion
        avanza;
        apagate;
    termina-ejecucion
finalizar-programa''')

        # Initial conditions.
        self.clean_state()
        self.assert_script_equal('window.state.mundo.i', 1)
        self.assert_script_equal('window.state.mundo.j', 1)

        # Compile.
        self.clean_state()
        driver.find_element_by_id('compilar').click()
        self.wait_for_log_message('Programa compilado (sintaxis pascal)',)

        # Execute.
        self.clean_state()
        driver.find_element_by_id('ejecutar').click()
        self.wait_for_log_message('Ejecución terminada')
        self.assert_script_equal('window.state.mundo.i', 2)
        self.assert_script_equal('window.state.mundo.j', 1)

        # Step-by-step.
        self.clean_state()
        driver.find_element_by_id('paso').click()
        driver.find_element_by_id('paso').click()
        driver.find_element_by_id('paso').click()
        self.wait_for_log_message('Ejecución terminada',)
        self.assert_script_equal('window.state.mundo.i', 2)
        self.assert_script_equal('window.state.mundo.j', 1)

        # See-the-future.
        self.clean_state()
        driver.find_element_by_id('futuro').click()
        self.wait_for_log_message('Ejecución terminada',)
        self.assert_script_equal('window.state.mundo.i', 2)
        self.assert_script_equal('window.state.mundo.j', 1)

        # Restore everything.
        self.clean_state()
        self.assert_script_equal('window.state.mundo.i', 1)
        self.assert_script_equal('window.state.mundo.j', 1)

    def init(self, world, code, delay=1):
        '''Replaces the current program code with |code|.'''

        self.driver.execute_script('window.state.init(%r, %r);' %
                                   (world, code))
        self.driver.find_element_by_id('retraso_txt').clear()
        self.driver.find_element_by_id('retraso_txt').send_keys(str(delay))

    def eval_script(self, script):
        '''Returns the evaluation of the JavaScript expression |script|'''

        return self.driver.execute_script('return (%s);' % script)

    def assert_script(self, script):
        '''Asserts that evaluating the JavaScript |script| returns true.'''

        self.assertTrue(self.driver.execute_script('return !!(%s);' % script),
                        msg='Evaluation of `%s` returned false' % script)

    def assert_script_equal(self, script, value):
        '''Asserts that evaluating the JavaScript |script| returns true.'''

        self.assertEqual(self.eval_script(script), value, msg=script)

    def clean_state(self):
        '''Cleans the state of the runtime.'''

        self.driver.find_element_by_id('worldclean').click()
        self.driver.execute_script('window.state.cleanLog();')

    def wait_for_log_message(self, message):
        '''Waits until |message| is posted to the log.'''

        try:
            self.wait.until(lambda _: re.search(
                r'^.*%s.*$' % re.escape(message),
                self.driver.find_element_by_css_selector('#mensajes>p').text))
        except TimeoutException as timeout:
            timeout.msg = self.driver.find_element_by_id('mensajes').text
            raise timeout

    def tearDown(self):
        try:
            if hasattr(self, '_outcome'):
                result = self.defaultTestResult()
                self._feedErrorsToResult(result, self._outcome.errors)
            else:
                result = getattr(self, '_outcomeForDoCleanups',
                                 getattr(self, '_resultForDoCleanups'))
            if not result.wasSuccessful():
                try:
                    self.driver.find_element_by_tag_name('body').send_keys(
                        Keys.CONTROL + Keys.SHIFT + 'k')
                except Exception as exc:  # pylint: disable=broad-except
                    print(exc)
                print(self.driver.get_screenshot_as_base64(), file=sys.stderr)
        except Exception as exc:  # pylint: disable=broad-except
            print(exc)
        self.driver.quit()


if __name__ == '__main__':
    unittest.main()
